/**
 * Atconiz production validation surface.
 * Run: node scripts/validate.js  (or npm run check)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

console.log("\nAtconiz validation\n");

// 1. Required files
const required = [
  "index.html",
  "styles.css",
  "helpers.js",
  "properties.js",
  "package.json",
  "vercel.json",
  "README.md",
  ".env.example",
  "api/chat.js",
  "api/hello.js",
  "js/core.js",
  "js/cards.js",
  "js/details.js",
  "js/chat.js",
  "js/calculators.js",
  "js/dashboards.js",
];
console.log("Files");
required.forEach((f) => {
  if (fs.existsSync(path.join(root, f))) ok(f);
  else fail(f, "missing");
});

// 2. Syntax check all JS
console.log("\nSyntax");
const jsFiles = [
  "helpers.js",
  "properties.js",
  "js/core.js",
  "js/cards.js",
  "js/details.js",
  "js/chat.js",
  "js/calculators.js",
  "js/dashboards.js",
  "api/chat.js",
  "api/hello.js",
  "scripts/validate.js",
];
jsFiles.forEach((f) => {
  try {
    execSync(`node --check "${path.join(root, f)}"`, { stdio: "pipe" });
    ok(f);
  } catch (e) {
    fail(f, "syntax error");
  }
});

// 3. Forbidden fake metrics / claims in source
console.log("\nIntegrity (no invented production metrics)");
const sources = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|html|css|md)$/.test(name)) sources.push(p);
  }
}
walk(root);

const banned = [
  { re: /96\.8%\s*MATCH/i, label: "96.8% MATCH claim" },
  { re: /98\.4%/i, label: "98.4% accuracy" },
  { re: /94\.2%\s*accuracy/i, label: "94.2% accuracy" },
  { re: /\b41,?892\b/, label: "fake active users 41892" },
  { re: /\b142,?847\b/, label: "fake 142847 metric" },
  { re: /\b18,?492\b/, label: "fake 18492 metric" },
  { re: /MATCH TO REAL MARKET PRICES/i, label: "match to real market" },
  { re: /94%\s*CONFIDENCE/i, label: "94% confidence badge" },
];

const skipFiles = new Set([path.join(root, "scripts", "validate.js"), path.join(root, "README.md")]);
for (const file of sources) {
  if (skipFiles.has(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const { re, label } of banned) {
    if (re.test(text)) fail(path.relative(root, file), label);
  }
}
if (failed === 0) ok("no banned fake metrics in product sources");

// 4. API chat must not leak key/models on GET
console.log("\nAPI security static checks");
const chatSrc = fs.readFileSync(path.join(root, "api/chat.js"), "utf8");
if (/hasKey\s*:/.test(chatSrc) && /method === ["']GET["']/.test(chatSrc)) {
  // only fail if hasKey appears in GET response path naively — check for models array leak
}
if (/models:\s*MODELS/.test(chatSrc)) fail("api/chat.js", "models list exposed to clients");
else ok("api/chat.js does not return MODELS to clients");
if (/Access-Control-Allow-Origin["']?\s*,\s*["']\*["']/.test(chatSrc)) {
  fail("api/chat.js", "wildcard CORS still present");
} else ok("api/chat.js no wildcard CORS");
if (!/no-store/.test(chatSrc)) fail("api/chat.js", "missing no-store cache header");
else ok("api/chat.js Cache-Control no-store");

// 5. package.json version
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.dependencies && pkg.dependencies["@google/genai"]) ok("@google/genai dependency present");
else fail("package.json", "missing @google/genai");

// 6. Deterministic valuation: no Math.random in calculators/chat valuation
console.log("\nDeterministic financial paths");
const calcSrc = fs.readFileSync(path.join(root, "js/calculators.js"), "utf8");
const chatJs = fs.readFileSync(path.join(root, "js/chat.js"), "utf8");
if (/Math\.random/.test(calcSrc)) fail("js/calculators.js", "Math.random in calculator");
else ok("js/calculators.js no Math.random");
const valSection = chatJs.slice(chatJs.indexOf("function runAIValuation"), chatJs.indexOf("function runQuickValuation"));
if (/Math\.random/.test(valSection)) fail("js/chat.js runAIValuation", "Math.random in valuation");
else ok("js/chat.js valuation deterministic");

console.log("\n────────────────────────────");
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) {
  process.exitCode = 1;
  console.log("Validation FAILED\n");
} else {
  console.log("Validation PASSED\n");
}
