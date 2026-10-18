import { asNumber } from "@/lib/utils";

export const REFERENCE_FX: Record<string, { rate: number; symbol: string; name: string }> = {
  USD: { rate: 1, symbol: "$", name: "US Dollar" },
  EUR: { rate: 0.92, symbol: "€", name: "Euro" },
  GBP: { rate: 0.79, symbol: "£", name: "British Pound" },
  AED: { rate: 3.67, symbol: "د.إ", name: "UAE Dirham" },
  INR: { rate: 83.5, symbol: "₹", name: "Indian Rupee" },
  SGD: { rate: 1.35, symbol: "S$", name: "Singapore Dollar" },
  CHF: { rate: 0.88, symbol: "CHF", name: "Swiss Franc" },
  JPY: { rate: 149, symbol: "¥", name: "Japanese Yen" },
  AUD: { rate: 1.52, symbol: "A$", name: "Australian Dollar" },
  CAD: { rate: 1.36, symbol: "C$", name: "Canadian Dollar" },
  HKD: { rate: 7.82, symbol: "HK$", name: "Hong Kong Dollar" },
};

export function convertAmount(amount: number, from: string, to: string): number {
  const src = REFERENCE_FX[from] ?? REFERENCE_FX.USD;
  const dst = REFERENCE_FX[to] ?? REFERENCE_FX.USD;
  const usd = amount / src.rate;
  return usd * dst.rate;
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency = "USD",
  opts: { compact?: boolean } = {},
): string {
  const n = asNumber(amount, 0);
  const meta = REFERENCE_FX[currency];
  const code = meta ? currency : "USD";
  if (opts.compact) return formatCompactMoney(n, code);
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: n >= 1000 ? 0 : 2,
    }).format(n);
  } catch {
    return `${code} ${n.toLocaleString("en")}`;
  }
}

export function formatCompactMoney(amount: number, currency = "USD"): string {
  const symbol = (REFERENCE_FX[currency] ?? REFERENCE_FX.USD).symbol;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${symbol}${(amount / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 100_000) return `${symbol}${(amount / 1_000).toFixed(0)}K`;
  return formatMoney(amount, currency);
}

export function formatArea(sqft: number | null | undefined): string {
  if (sqft == null) return "—";
  return `${Math.round(sqft).toLocaleString("en")} sq ft`;
}

export function formatBedsBaths(beds: number | null, baths: number | null): string {
  const b = beds == null ? "—" : String(beds);
  const ba = baths == null ? "—" : String(baths);
  return `${b} bed · ${ba} bath`;
}

export function provenanceLabel(provenance: string): string {
  if (provenance === "SEED_DEVELOPMENT" || provenance === "REFERENCE") {
    return "Reference catalog";
  }
  if (provenance === "AGENT_CREATED") return "Agent listing";
  if (provenance === "ADMIN_CREATED") return "Atelier listing";
  return provenance.replaceAll("_", " ").toLowerCase();
}
