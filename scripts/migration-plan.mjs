// @ts-check
/**
 * Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
 * (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
 *
 * Applied files are keyed by BASENAME, so the same file applies once no matter
 * which directory it is globbed from. That is what makes the auth schema safe to
 * copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
 * a database that already has `0001_auth.sql` will not re-run it.
 *
 * Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
 * out of scope for both until it is copied up.
 */

/**
 * The `_migrations` key for a migration path (or bare filename).
 * @param {string} path
 * @returns {string}
 */
export function migrationName(path) {
  return path.split("/").pop() ?? path;
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isMigrationFile(path) {
  return path.endsWith(".sql");
}

/**
 * Migrations in `paths` that are not yet in `applied`, in apply order.
 * Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
 * @param {Iterable<string>} paths
 * @param {Iterable<string>} applied
 * @returns {Array<{ name: string, path: string }>}
 */
export function pendingMigrations(paths, applied) {
  const done = new Set(applied);
  return [...paths]
    .filter(isMigrationFile)
    .map((path) => ({ name: migrationName(path), path }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(({ name }) => !done.has(name));
}

/**
 * Split a migration file into statements. Keeps quotes and dollar-quotes intact
 * so a Neon pooler (which rejects multi-command queries) can run them one by one.
 * @param {string} sql
 * @returns {string[]}
 */
export function splitSql(sql) {
  /** @type {string[]} */
  const statements = [];
  let buf = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  /** @type {string | null} */
  let dollar = null;
  while (i < sql.length) {
    if (!inSingle && !inDouble && !dollar && sql.startsWith("--", i)) {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end + 1;
      continue;
    }
    if (!inSingle && !inDouble && !dollar && sql[i] === "$") {
      const tag = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (tag) {
        dollar = tag[0];
        buf += tag[0];
        i += tag[0].length;
        continue;
      }
    }
    if (dollar) {
      if (sql.startsWith(dollar, i)) {
        buf += dollar;
        i += dollar.length;
        dollar = null;
        continue;
      }
      buf += sql[i];
      i += 1;
      continue;
    }
    if (!inDouble && sql[i] === "'") {
      if (inSingle && sql[i + 1] === "'") {
        buf += "''";
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      buf += sql[i];
      i += 1;
      continue;
    }
    if (!inSingle && sql[i] === '"') {
      inDouble = !inDouble;
      buf += sql[i];
      i += 1;
      continue;
    }
    if (!inSingle && !inDouble && sql[i] === ";") {
      const statement = buf.trim();
      if (statement) statements.push(statement);
      buf = "";
      i += 1;
      continue;
    }
    buf += sql[i];
    i += 1;
  }
  const tail = buf.trim();
  if (tail) statements.push(tail);
  return statements;
}
