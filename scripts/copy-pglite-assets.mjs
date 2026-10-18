#!/usr/bin/env node
/**
 * Nitro's server bundle imports PGLite via `new URL("./pglite.data", import.meta.url)`
 * but does not emit the wasm/data siblings. Copy them next to the bundled module
 * so preview and Vercel can boot the embedded database.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules/@electric-sql/pglite/dist");
const destDir = join(root, ".vercel/output/functions/__server.func/_libs");
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];

if (!existsSync(destDir)) {
  console.log("[pglite-assets] no server bundle — skip");
  process.exit(0);
}

for (const name of files) {
  const from = join(srcDir, name);
  if (!existsSync(from)) {
    console.error(`[pglite-assets] missing ${from}`);
    process.exit(1);
  }
  copyFileSync(from, join(destDir, name));
}
console.log("[pglite-assets] copied PGLite runtime files next to the server bundle");
