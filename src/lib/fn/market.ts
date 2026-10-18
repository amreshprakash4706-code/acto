import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchAllActive } from "./properties";
import { convertAmount } from "@/lib/atconiz/format";
import { estimateLandValue } from "@/lib/atconiz/land";
import { calculateEmi, rentalYield, affordability, rentVsBuy, closingCosts } from "@/lib/atconiz/finance";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { nid, asJsonRow } from "@/lib/utils";

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const marketOverview = createServerFn({ method: "GET" }).handler(async () => {
  const all = await fetchAllActive();
  const sales = all.filter((p) => p.listingType === "SALE");
  const cities = [...new Set(all.map((p) => p.city))];
  const cityRows = cities.map((city) => {
    const set = all.filter((p) => p.city === city);
    const saleSet = set.filter((p) => p.listingType === "SALE");
    const usdPrices = saleSet.map((p) => convertAmount(p.price, p.currency, "USD"));
    const avg = usdPrices.length ? usdPrices.reduce((a, b) => a + b, 0) / usdPrices.length : 0;
    const ppsf = saleSet
      .filter((p) => p.areaSqft)
      .map((p) => convertAmount(p.price, p.currency, "USD") / (p.areaSqft as number));
    const avgPpsf = ppsf.length ? ppsf.reduce((a, b) => a + b, 0) / ppsf.length : 0;
    const types = [...new Set(set.map((p) => p.propertyType))];
    return {
      city,
      country: set[0]?.country ?? "",
      listings: set.length,
      saleCount: saleSet.length,
      rentCount: set.length - saleSet.length,
      avgUsd: Math.round(avg),
      medianUsd: Math.round(median(usdPrices)),
      minUsd: usdPrices.length ? Math.round(Math.min(...usdPrices)) : 0,
      maxUsd: usdPrices.length ? Math.round(Math.max(...usdPrices)) : 0,
      avgPpsf: Math.round(avgPpsf),
      types,
      typeCounts: types.map((type) => ({ type, count: set.filter((p) => p.propertyType === type).length })),
      neighborhoods: [...new Set(set.map((p) => p.neighborhood).filter((n): n is string => Boolean(n)))].sort(),
    };
  }).sort((a, b) => b.avgUsd - a.avgUsd);

  const typeRows = [...new Set(all.map((p) => p.propertyType))].map((type) => {
    const set = all.filter((p) => p.propertyType === type);
    return { type, count: set.length };
  });

  return {
    listings: all.length,
    saleListings: sales.length,
    rentListings: all.length - sales.length,
    cities: cityRows,
    types: typeRows,
    note: "All figures are computed from the Atconiz reference catalog. They are not a live market index.",
  };
});

export const landEstimate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      country: z.string(),
      city: z.string().optional(),
      type: z.string().optional(),
      areaSqft: z.number().positive(),
      premium: z.number().min(1).max(10).optional(),
    }),
  )
  .handler(async ({ data }) => estimateLandValue(data));

export const runFinance = createServerFn({ method: "POST" })
  .validator(
    z.object({
      kind: z.enum(["emi", "affordability", "yield", "rentVsBuy", "closing"]),
      principal: z.number().optional(),
      annualRatePct: z.number().optional(),
      tenureYears: z.number().optional(),
      monthlyIncome: z.number().optional(),
      monthlyDebts: z.number().optional(),
      downPayment: z.number().optional(),
      price: z.number().optional(),
      monthlyRent: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.kind === "emi") {
      return {
        kind: data.kind,
        result: calculateEmi({
          principal: data.principal ?? 0,
          annualRatePct: data.annualRatePct ?? 6.5,
          tenureYears: data.tenureYears ?? 20,
        }),
      };
    }
    if (data.kind === "affordability") {
      return {
        kind: data.kind,
        result: affordability({
          monthlyIncome: data.monthlyIncome ?? 0,
          monthlyDebts: data.monthlyDebts ?? 0,
          downPayment: data.downPayment ?? 0,
          annualRatePct: data.annualRatePct ?? 6.5,
          tenureYears: data.tenureYears ?? 25,
        }),
      };
    }
    if (data.kind === "yield") {
      return {
        kind: data.kind,
        result: rentalYield({ price: data.price ?? 0, monthlyRent: data.monthlyRent ?? 0 }),
      };
    }
    if (data.kind === "rentVsBuy") {
      return {
        kind: data.kind,
        result: rentVsBuy({
          price: data.price ?? 0,
          monthlyRent: data.monthlyRent ?? 0,
          annualRatePct: data.annualRatePct ?? 6.5,
          tenureYears: data.tenureYears ?? 25,
        }),
      };
    }
    return { kind: data.kind, result: closingCosts(data.price ?? 0) };
  });

export const saveCalculation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      type: z.string(),
      inputs: z.string(),
      results: z.string(),
      label: z.string().optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = nid("calc");
    await sql`
      insert into saved_calculations (id, user_id, type, inputs, results, label)
      values (${id}, ${context.userId}, ${data.type}, ${data.inputs}::jsonb, ${data.results}::jsonb, ${data.label ?? null})
    `;
    return { id };
  });

export const myCalculations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, type, inputs, results, label, created_at
      from saved_calculations where user_id = ${context.userId}
      order by created_at desc limit 20
    `;
    return rows.map(asJsonRow);
  });
