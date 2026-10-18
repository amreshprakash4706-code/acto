/** Deterministic real-estate calculators. Illustrative — not financial advice. */

export type EmiInput = {
  principal: number;
  annualRatePct: number;
  tenureYears: number;
};

export type EmiResult = {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  months: number;
  schedulePreview: { month: number; principal: number; interest: number; balance: number }[];
};

export function calculateEmi(input: EmiInput): EmiResult {
  const P = Math.max(0, input.principal);
  const n = Math.max(1, Math.round(input.tenureYears * 12));
  const r = Math.max(0, input.annualRatePct) / 100 / 12;
  let monthly: number;
  if (r === 0) monthly = P / n;
  else monthly = (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);

  const schedulePreview: EmiResult["schedulePreview"] = [];
  let balance = P;
  for (let month = 1; month <= n && month <= 6; month += 1) {
    const interest = balance * r;
    const principal = Math.min(balance, monthly - interest);
    balance = Math.max(0, balance - principal);
    schedulePreview.push({ month, principal, interest, balance });
  }

  return {
    monthlyPayment: monthly,
    totalPayment: monthly * n,
    totalInterest: monthly * n - P,
    months: n,
    schedulePreview,
  };
}

export function affordability(opts: {
  monthlyIncome: number;
  monthlyDebts: number;
  downPayment: number;
  annualRatePct: number;
  tenureYears: number;
  dtiPct?: number;
}): { maxLoan: number; maxPrice: number; monthlyBudget: number } {
  const dti = (opts.dtiPct ?? 36) / 100;
  const monthlyBudget = Math.max(0, opts.monthlyIncome * dti - opts.monthlyDebts);
  const n = Math.max(1, Math.round(opts.tenureYears * 12));
  const r = Math.max(0, opts.annualRatePct) / 100 / 12;
  const maxLoan =
    r === 0 ? monthlyBudget * n : monthlyBudget * ((1 + r) ** n - 1) / (r * (1 + r) ** n);
  return {
    monthlyBudget,
    maxLoan,
    maxPrice: maxLoan + Math.max(0, opts.downPayment),
  };
}

export function rentalYield(opts: {
  price: number;
  monthlyRent: number;
  annualExpenses?: number;
}): { grossYieldPct: number; netYieldPct: number; annualRent: number; noi: number } {
  const annualRent = opts.monthlyRent * 12;
  const expenses = opts.annualExpenses ?? annualRent * 0.25;
  const noi = annualRent - expenses;
  const price = Math.max(1, opts.price);
  return {
    annualRent,
    noi,
    grossYieldPct: (annualRent / price) * 100,
    netYieldPct: (noi / price) * 100,
  };
}

export function capRate(noi: number, price: number): number {
  return (noi / Math.max(1, price)) * 100;
}

export function cashOnCash(opts: {
  annualCashFlow: number;
  downPayment: number;
  closingCosts?: number;
}): number {
  const invested = Math.max(1, opts.downPayment + (opts.closingCosts ?? 0));
  return (opts.annualCashFlow / invested) * 100;
}

export function rentVsBuy(opts: {
  price: number;
  monthlyRent: number;
  annualRatePct: number;
  tenureYears: number;
  downPaymentPct?: number;
  taxRatePct?: number;
  maintenancePct?: number;
  rentGrowthPct?: number;
  homeGrowthPct?: number;
  horizonYears?: number;
}): {
  buyTotal: number;
  rentTotal: number;
  equityAfterHorizon: number;
  advantage: "buy" | "rent" | "similar";
  notes: string[];
} {
  const downPct = opts.downPaymentPct ?? 20;
  const horizon = opts.horizonYears ?? 7;
  const down = opts.price * (downPct / 100);
  const loan = opts.price - down;
  const emi = calculateEmi({
    principal: loan,
    annualRatePct: opts.annualRatePct,
    tenureYears: opts.tenureYears,
  });
  const tax = opts.price * ((opts.taxRatePct ?? 1.1) / 100);
  const maint = opts.price * ((opts.maintenancePct ?? 1) / 100);
  const buyAnnual = emi.monthlyPayment * 12 + tax + maint;
  const buyTotal = down + buyAnnual * horizon;
  let rentTotal = 0;
  let rent = opts.monthlyRent;
  const rentGrowth = (opts.rentGrowthPct ?? 3) / 100;
  for (let y = 0; y < horizon; y += 1) {
    rentTotal += rent * 12;
    rent *= 1 + rentGrowth;
  }
  const growth = (opts.homeGrowthPct ?? 3) / 100;
  const value = opts.price * (1 + growth) ** horizon;
  const remainingFrac = Math.max(0, 1 - horizon / Math.max(1, opts.tenureYears));
  const remainingLoan = loan * remainingFrac;
  const equityAfterHorizon = value - remainingLoan;
  const netBuy = buyTotal - equityAfterHorizon;
  let advantage: "buy" | "rent" | "similar" = "similar";
  if (netBuy + 0.05 * opts.price < rentTotal) advantage = "buy";
  else if (rentTotal + 0.05 * opts.price < netBuy) advantage = "rent";
  return {
    buyTotal,
    rentTotal,
    equityAfterHorizon,
    advantage,
    notes: [
      "Uses reference assumptions, not a personalised underwrite.",
      `Down payment modelled at ${downPct}% with remaining principal linearly approximated.`,
      "Taxes, maintenance, rent growth and appreciation are user-editable estimates.",
    ],
  };
}

export function closingCosts(price: number, pct = 3): { amount: number; pct: number } {
  return { amount: Math.max(0, price) * (pct / 100), pct };
}

export function ownershipCost(opts: {
  price: number;
  downPaymentPct?: number;
  annualRatePct: number;
  tenureYears: number;
  closingPct?: number;
  annualTax?: number;
  annualInsurance?: number;
  annualMaintenance?: number;
  horizonYears?: number;
}): {
  closing: number;
  downPayment: number;
  monthlyPayment: number;
  annualCarry: number;
  horizonCash: number;
  notes: string[];
} {
  const downPct = opts.downPaymentPct ?? 20;
  const horizon = Math.max(1, opts.horizonYears ?? 5);
  const downPayment = Math.max(0, opts.price) * (downPct / 100);
  const closing = closingCosts(opts.price, opts.closingPct ?? 3).amount;
  const loan = Math.max(0, opts.price - downPayment);
  const emi = calculateEmi({
    principal: loan,
    annualRatePct: opts.annualRatePct,
    tenureYears: opts.tenureYears,
  });
  const annualCarry =
    (opts.annualTax ?? opts.price * 0.011) +
    (opts.annualInsurance ?? opts.price * 0.004) +
    (opts.annualMaintenance ?? opts.price * 0.01);
  return {
    closing,
    downPayment,
    monthlyPayment: emi.monthlyPayment,
    annualCarry,
    horizonCash: downPayment + closing + (emi.monthlyPayment * 12 + annualCarry) * horizon,
    notes: [
      `${horizon}-year cash outlay. Default tax, insurance, and maintenance are reference rates.`,
      "Ignores appreciation, tax deductibility, and opportunity cost of the down payment.",
    ],
  };
}
