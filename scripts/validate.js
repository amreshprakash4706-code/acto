/**
 * Atconiz production validation surface.
 * Run: node scripts/validate.js  (or npm run check)
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let failed = 0;
let passed = 0;

function ok(name) {
  passed++;
  console.log("  ✓", name);
}
function fail(name, detail) {
  failed++;
  console.error("  ✗", name, detail ? "— " + detail : "");
}

console.log("\nAtconiz validation (v4 full-stack)\n");

const required = [
  "index.html",
  "styles.css",
  "helpers.js",
  "properties.js",
  "package.json",
  "README.md",
  ".env.example",
  "js/api/client.js",
  "js/core.js",
  "js/cards.js",
  "js/details.js",
  "js/chat.js",
  "js/calculators.js",
  "js/dashboards.js",
  "api/index.js",
  "server/app.js",
  "server/server.js",
  "server/db/schema.prisma",
  "server/config/index.js",
  "server/routes/auth.js",
  "server/routes/properties.js",
  "server/services/authService.js",
  "server/services/propertyService.js",
  "server/ai/geminiProvider.js",
];

console.log("Files");
required.forEach((f) => {
  if (fs.existsSync(path.join(root, f))) ok(f);
  else fail(f, "missing");
});

// Syntax check critical server files
console.log("\nSyntax");
const { execSync } = require("child_process");
const syntaxFiles = [
  "api/index.js",
  "server/app.js",
  "server/server.js",
  "server/services/authService.js",
  "server/services/propertyService.js",
  "js/api/client.js",
  "properties.js",
];
syntaxFiles.forEach((f) => {
  try {
    execSync(`node --check "${path.join(root, f)}"`, { stdio: "pipe" });
    ok(f);
  } catch (e) {
    fail(f, "syntax error");
  }
});

// package.json scripts
console.log("\nPackage");
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  ["dev", "start", "test", "db:migrate", "db:seed"].forEach((s) => {
    if (pkg.scripts && pkg.scripts[s]) ok("script:" + s);
    else fail("script:" + s, "missing");
  });
} catch (e) {
  fail("package.json", e.message);
}

console.log("\nResult:", passed, "passed,", failed, "failed\n");
process.exit(failed > 0 ? 1 : 0);
