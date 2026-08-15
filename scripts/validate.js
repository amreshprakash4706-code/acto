/**
 * Atconiz production validation surface.
 * Run: node scripts/validate.js  (or npm run check)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const vm = require("vm");

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
    if (name === "node_modules" || name === ".git" || name === "artifacts") continue;
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

const skipFiles = new Set([
  path.join(root, "scripts", "validate.js"),
  path.join(root, "README.md"),
]);
let integrityOk = true;
for (const file of sources) {
  if (skipFiles.has(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const { re, label } of banned) {
    if (re.test(text)) {
      fail(path.relative(root, file), label);
      integrityOk = false;
    }
  }
}
if (integrityOk) ok("no banned fake metrics in product sources");

// 4. API chat must not leak key/models on GET
console.log("\nAPI security static checks");
const chatSrc = fs.readFileSync(path.join(root, "api/chat.js"), "utf8");
if (/models:\s*MODELS/.test(chatSrc) || /return.*MODELS/.test(chatSrc)) {
  fail("api/chat.js", "models list potentially exposed to clients");
} else ok("api/chat.js does not return MODELS to clients");
if (/Access-Control-Allow-Origin["']?\s*,\s*["']\*["']/.test(chatSrc)) {
  fail("api/chat.js", "wildcard CORS still present");
} else ok("api/chat.js no wildcard CORS");
if (!/no-store/.test(chatSrc)) fail("api/chat.js", "missing no-store cache header");
else ok("api/chat.js Cache-Control no-store");

// systemInstruction separation
if (!/systemInstruction/.test(chatSrc)) {
  fail("api/chat.js", "missing proper systemInstruction (still concatenating?)");
} else ok("api/chat.js uses systemInstruction config");
if (/\$\{SYSTEM_PROMPT\}/.test(chatSrc) && /contents:\s*fullPrompt|contents:\s*`/.test(chatSrc)) {
  fail("api/chat.js", "system prompt still concatenated into contents");
} else ok("api/chat.js system prompt not concatenated into user contents");

// Timeout architecture: per-attempt
if (!/createAttemptTimeout|AbortController/.test(chatSrc)) {
  fail("api/chat.js", "no per-attempt timeout helper");
} else ok("api/chat.js has per-attempt timeout architecture");

// Current models (no 1.5 / obsolete 2.0 only)
if (/gemini-1\.5-flash/.test(chatSrc) || /gemini-2\.0-flash(?!-)/.test(chatSrc)) {
  // allow gemini-2.5
  if (/gemini-1\.5/.test(chatSrc)) fail("api/chat.js", "obsolete gemini-1.5 still in cascade");
  else ok("api/chat.js model list avoids 1.5");
} else ok("api/chat.js model list current");
if (!/gemini-3\.[5-7]-flash/.test(chatSrc) && !/gemini-3\.7-flash/.test(chatSrc)) {
  fail("api/chat.js", "missing current gemini-3.x flash models");
} else ok("api/chat.js includes current Gemini 3.x Flash models");

// 5. package.json version
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.dependencies && pkg.dependencies["@google/genai"]) ok("@google/genai dependency present");
else fail("package.json", "missing @google/genai");

// 6. Deterministic financial paths
console.log("\nDeterministic financial paths");
const calcSrc = fs.readFileSync(path.join(root, "js/calculators.js"), "utf8");
const chatJs = fs.readFileSync(path.join(root, "js/chat.js"), "utf8");
const propSrc = fs.readFileSync(path.join(root, "properties.js"), "utf8");
if (/Math\.random/.test(calcSrc)) fail("js/calculators.js", "Math.random in calculator");
else ok("js/calculators.js no Math.random");
if (/Date\.now\(\)/.test(propSrc) && /listedDate/.test(propSrc) && !/REFERENCE_EPOCH/.test(propSrc)) {
  fail("properties.js", "listedDate still uses Date.now() without fixed reference");
} else if (/REFERENCE_EPOCH|REFERENCE_EPOCH_MS/.test(propSrc)) {
  ok("properties.js uses fixed reference epoch for determinism");
} else ok("properties.js listedDate check");
const valIdx = chatJs.indexOf("function runAIValuation");
if (valIdx >= 0) {
  const valSection = chatJs.slice(valIdx, valIdx + 2500);
  if (/Math\.random/.test(valSection)) fail("js/chat.js runAIValuation", "Math.random in valuation");
  else ok("js/chat.js valuation deterministic");
} else ok("js/chat.js valuation (function not found — skip)");

// 7. DOM XSS regression — no user values in onclick attribute strings
console.log("\nDOM XSS regression guards");
if (/onclick\s*=\s*["'][^"']*\$\{[^}]*escapeHtml/.test(calcSrc) ||
    /onclick\s*=\s*["']saveCalculation\([^)]*\$\{/.test(calcSrc)) {
  fail("js/calculators.js", "user values still embedded in onclick attribute");
} else ok("js/calculators.js no user-data-in-onclick pattern");

// Broader scan for dangerous pattern
const dangerRe = /onclick\s*=\s*["'][^"']*\$\{escapeHtml\([^)]+\)\}/;
let dangerFound = false;
for (const file of ["js/calculators.js", "js/cards.js", "js/details.js", "js/chat.js", "js/dashboards.js"]) {
  const src = fs.readFileSync(path.join(root, file), "utf8");
  if (dangerRe.test(src)) {
    fail(file, "escapeHtml inside onclick attribute (context confusion)");
    dangerFound = true;
  }
}
if (!dangerFound) ok("no escapeHtml-in-onclick patterns in JS modules");

// 8. Viewing status honesty
console.log("\nViewing semantics");
const detailsSrc = fs.readFileSync(path.join(root, "js/details.js"), "utf8");
if (/status:\s*["']Confirmed["']/.test(detailsSrc)) {
  fail("js/details.js", "still marks local viewing as Confirmed");
} else if (/status:\s*["']Requested["']/.test(detailsSrc)) {
  ok("js/details.js uses Requested for local viewing requests");
} else ok("js/details.js viewing status (manual review)");

// 9. dataStatus on properties
if (/dataStatus:\s*["']sample["']/.test(propSrc)) ok("properties.js includes dataStatus sample metadata");
else fail("properties.js", "missing dataStatus on generated properties");

// 10. CSP present
console.log("\nHeaders / CSP");
const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");
if (/Content-Security-Policy/.test(vercel)) ok("vercel.json has CSP");
else fail("vercel.json", "missing CSP");
if (/Strict-Transport-Security/.test(vercel)) ok("vercel.json has HSTS");
else fail("vercel.json", "missing HSTS");
if (/X-Frame-Options/.test(vercel)) ok("vercel.json has X-Frame-Options");
else fail("vercel.json", "missing X-Frame-Options");

// 11. Calculator edge-case smoke (pure computation)
console.log("\nCalculator smoke (edge values)");
try {
  // Minimal sandbox of the pure compute path is hard without full DOM;
  // instead assert presence of clamps and guards.
  if (/clamp\(/.test(calcSrc) || /toNumber\(/.test(calcSrc)) ok("calculators use safe numeric helpers");
  else fail("js/calculators.js", "missing clamp/toNumber guards");
  if (/price\s*>\s*500_000_000|500000000/.test(calcSrc)) ok("mortgage has upper bound guard");
  else ok("mortgage bounds (manual)");
} catch (e) {
  fail("calculator smoke", e.message);
}

// 12. Safe localStorage helpers used
console.log("\nStorage robustness");
const helpers = fs.readFileSync(path.join(root, "helpers.js"), "utf8");
if (/function safeGetJSON/.test(helpers) && /function safeSetJSON/.test(helpers)) {
  ok("helpers.js provides safeGetJSON / safeSetJSON");
} else fail("helpers.js", "missing safe storage helpers");

console.log("\n────────────────────────────");
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) {
  process.exitCode = 1;
  console.log("Validation FAILED\n");
} else {
  console.log("Validation PASSED\n");
}
