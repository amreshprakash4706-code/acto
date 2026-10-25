#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs during `npm run build` — on every Vercel deploy — applying pending files
 * in ../migrations to DATABASE_URL. Each file is applied in one transaction and
 * recorded in a `_migrations` table, so it runs once and is safe to re-run.
 *
 * The read is non-recursive, so the opt-in auth schema under migrations/auth/
 * is not applied to an app that never asked for sign-in.
 *
 * No DATABASE_URL (local / preview builds) -> skip; the PGLite fallback applies
 * the same files at startup instead (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { pendingMigrations, splitSql } from "./migration-plan.mjs";

/**
 * Prefer a direct (non-pooler) URL. Neon/Vercel inject the pooled string, and
 * PgBouncer rejects the multi-statement migration files.
 */
function migrationUrl() {
  const raw = [
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
  ]
    .map((value) => value?.trim())
    .find(Boolean);
  if (!raw) return "";
  return raw
    .replace(/([/@])([^/@?#]+)-pooler\./, "$1$2.")
    .replace(/([?&])(sslmode|channel_binding)=[^&]*/g, "$1")
    .replace(/\?&/g, "?")
    .replace(/[?&]$/, "");
}

const databaseUrl = migrationUrl();
if (!databaseUrl) {
  console.log(
    "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

function poolConfig(connectionString) {
  const local = /localhost|127\.0\.0\.1|\[::1\]/.test(connectionString);
  const sslDisabled = /sslmode=disable/.test(connectionString);
  return {
    connectionString,
    max: 1,
    connectionTimeoutMillis: 20000,
    // Vercel Postgres and Neon present a certificate node-pg rejects by default,
    // which aborts `npm run build` with exit code 1.
    ssl: local || sslDisabled ? undefined : { rejectUnauthorized: false },
  };
}

/** Network/TLS failures must not fail the Vercel build. SQL errors still do. */
function isConnectionError(err) {
  const code = err?.code;
  if (
    code &&
    [
      "ENOTFOUND",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ECONNRESET",
      "EAI_AGAIN",
      "ENETUNREACH",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "SELF_SIGNED_CERT_IN_CHAIN",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    ].includes(code)
  ) {
    return true;
  }
  return /timeout|ECONN|ENOTFOUND|certificate|getaddrinfo|Connection terminated|no pg_hba|SSL/i.test(
    String(err?.message || ""),
  );
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  // An app with no schema of its own must not pay for a database connection.
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool(poolConfig(databaseUrl));
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        for (const statement of splitSql(text)) {
          await client.query(statement);
        }
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  if (isConnectionError(err)) {
    console.error(
      "[migrate] database unreachable during build — continuing. Schema is applied on the first server request.",
    );
    process.exit(0);
  }
  process.exit(1);
});
