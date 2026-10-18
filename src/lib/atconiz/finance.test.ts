import assert from "node:assert/strict";
import test from "node:test";
import { affordability, calculateEmi, capRate, cashOnCash, ownershipCost, rentalYield } from "./finance.ts";
import { parseNaturalQuery } from "./nl-search.ts";
import { scoreLead } from "./lead-score.ts";

test("EMI is zero-interest linear", () => {
  const r = calculateEmi({ principal: 1200, annualRatePct: 0, tenureYears: 1 });
  assert.equal(r.monthlyPayment, 100);
  assert.equal(r.totalInterest, 0);
});

test("EMI total exceeds principal when interest is charged", () => {
  const r = calculateEmi({ principal: 1_000_000, annualRatePct: 6, tenureYears: 20 });
  assert.ok(r.monthlyPayment > 0);
  assert.ok(r.totalPayment > 1_000_000);
});

test("gross yield is annual rent over price", () => {
  const r = rentalYield({ price: 1_000_000, monthlyRent: 5000, annualExpenses: 0 });
  assert.equal(r.grossYieldPct, 6);
});

test("affordability respects DTI", () => {
  const r = affordability({
    monthlyIncome: 10000,
    monthlyDebts: 0,
    downPayment: 200000,
    annualRatePct: 0,
    tenureYears: 10,
    dtiPct: 36,
  });
  assert.equal(r.monthlyBudget, 3600);
});

test("cap rate and cash-on-cash are ratios", () => {
  assert.equal(capRate(60_000, 1_000_000), 6);
  assert.equal(cashOnCash({ annualCashFlow: 8_000, downPayment: 80_000, closingCosts: 0 }), 10);
});

test("ownership cost is down payment plus carry", () => {
  const r = ownershipCost({
    price: 100_000,
    downPaymentPct: 20,
    annualRatePct: 0,
    tenureYears: 10,
    closingPct: 0,
    annualTax: 0,
    annualInsurance: 0,
    annualMaintenance: 0,
    horizonYears: 1,
  });
  assert.equal(Math.round(r.horizonCash), 28_000);
});

test("natural language parser extracts constraints", () => {
  const q = parseNaturalQuery("3 bedroom villa in dubai under 10 million with a pool");
  assert.equal(q.minBeds, 3);
  assert.equal(q.city, "Dubai");
  assert.equal(q.type, "Villa");
  assert.equal(q.maxPrice, 10_000_000);
  assert.equal(q.amenity, "Pool");
});

test("lead score is bounded and explainable", () => {
  const s = scoreLead({
    views: 8,
    uniqueDays: 3,
    favorites: 2,
    inquiries: 1,
    viewings: 1,
    recencyHours: 5,
  });
  assert.ok(s.score <= 100);
  assert.ok(s.reasons.length >= 3);
});
