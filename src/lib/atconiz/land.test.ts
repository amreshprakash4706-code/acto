import assert from "node:assert/strict";
import test from "node:test";
import { estimateLandValue, quoteLand, toSqft } from "./land.ts";

test("legacy valuation fallback keeps the United States table rate", () => {
  const r = estimateLandValue({ country: "United States", city: "Des Moines", type: "Land", areaSqft: 1000, premium: 5 });
  assert.equal(r.usdPerSqft, 450);
});

test("aliases and any listed country price a parcel", () => {
  const usa = quoteLand({ country: "USA", place: "Des Moines", setting: "suburban", area: 1, unit: "acre" });
  const kenya = quoteLand({ country: "Kenya", place: "Nakuru", setting: "agricultural", use: "agricultural", area: 1, unit: "acre" });
  assert.equal(usa.countryName, "United States");
  assert.equal(usa.marketName, null);
  assert.ok(usa.usd > 0);
  assert.ok(kenya.usd > 0);
  assert.ok(kenya.usd < usa.usd);
});

test("a named prime market is far above remote land in the same country", () => {
  const core = quoteLand({ country: "United States", place: "Manhattan", setting: "prime", area: 1000, unit: "sqft" });
  const remote = quoteLand({ country: "United States", place: "Manhattan", setting: "remote", area: 1000, unit: "sqft" });
  assert.equal(core.marketName, "Manhattan");
  assert.ok(core.usdPerSqft > 1000);
  assert.ok(remote.usdPerSqft < 10);
});

test("an unlisted country still prices from the world band", () => {
  const r = quoteLand({ country: "Zamunda", place: "a village inland", setting: "suburban", area: 1000, unit: "sqft" });
  assert.equal(r.countryName, null);
  assert.equal(r.usdPerSqft, 2.5);
  assert.ok(r.ready);
  assert.match(r.notes[0], /Zamunda/);
});

test("a market is not borrowed from another country", () => {
  const r = quoteLand({ country: "Kenya", place: "Manhattan", setting: "prime", area: 1000, unit: "sqft" });
  assert.equal(r.marketName, null);
  assert.equal(r.countryName, "Kenya");
});

test("hectares convert to square feet", () => {
  assert.ok(Math.abs(toSqft(1, "hectare") - 107639) < 2);
});
