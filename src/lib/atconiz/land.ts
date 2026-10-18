/** Static land reference rates (USD per sqft) — legacy luxury fallback for catalog valuation. */

import { COUNTRIES, KNOWN_MARKETS, type CountryRate } from "./land-rates.ts";

export const LAND_USD_PER_SQFT: Record<string, number> = {
  "United States": 450,
  "United Arab Emirates": 380,
  "United Kingdom": 920,
  India: 85,
  Singapore: 6800,
  France: 1650,
  Australia: 920,
  Canada: 780,
  Switzerland: 3200,
  "Hong Kong": 12500,
  Japan: 1450,
  Germany: 980,
  Italy: 720,
  Spain: 650,
  Brazil: 420,
  "South Africa": 310,
  China: 890,
  Monaco: 4800,
};

export const CITY_PREMIUM: Record<string, Record<string, number>> = {
  "United States": {
    "Beverly Hills": 4.2,
    Malibu: 3.8,
    Manhattan: 5.1,
    Tribeca: 4.6,
    default: 1,
  },
  "United Arab Emirates": { Dubai: 2.8, "Palm Jumeirah": 3.4, default: 1 },
  "United Kingdom": { Mayfair: 4.8, Kensington: 3.9, default: 1.2 },
  India: { Mumbai: 3.1, Delhi: 2.4, Bandra: 3.6, Worli: 3.4, default: 1 },
  France: { Paris: 2.8, default: 1 },
  Monaco: { default: 1.4 },
};

const TYPE_MULT: Record<string, number> = {
  Land: 1,
  Villa: 2.4,
  Estate: 2.8,
  "Luxury Villa": 2.6,
  Penthouse: 3.1,
  Apartment: 2.2,
  Townhouse: 2.3,
  Loft: 2.1,
  House: 2.2,
  Chalet: 2.5,
};

export function estimateLandValue(opts: {
  country: string;
  city?: string;
  type?: string;
  areaSqft: number;
  premium?: number;
}): { usd: number; usdPerSqft: number; notes: string[] } {
  const base = LAND_USD_PER_SQFT[opts.country] ?? 400;
  const cityMap = CITY_PREMIUM[opts.country] ?? { default: 1 };
  const cityKey = opts.city ?? "";
  const cityMult =
    Object.entries(cityMap).find(([k]) => k !== "default" && cityKey.toLowerCase().includes(k.toLowerCase()))?.[1] ??
    cityMap.default ??
    1;
  const typeMult = TYPE_MULT[opts.type ?? "Villa"] ?? 2.2;
  const loc = Math.max(0.5, Math.min(10, opts.premium ?? 5)) / 5;
  const usdPerSqft = base * cityMult * loc;
  const usd = usdPerSqft * Math.max(1, opts.areaSqft) * (opts.type === "Land" ? 1 : typeMult * 0.35 + 0.65);
  return {
    usd,
    usdPerSqft,
    notes: [
      `Country reference ${opts.country}: ${base} USD/sqft (static table).`,
      `City multiplier ${cityMult.toFixed(2)}; type ${opts.type ?? "n/a"} ${typeMult}.`,
      "Not a formal appraisal or live market quote.",
    ],
  };
}

export type LandSetting = "prime" | "urban" | "suburban" | "town" | "agricultural" | "remote";
export type LandUse = "residential" | "commercial" | "agricultural" | "raw";
export type AreaUnit = "sqft" | "sqm" | "acre" | "hectare";

export const SQFT_PER_UNIT: Record<AreaUnit, number> = {
  sqft: 1,
  sqm: 10.76391041671,
  acre: 43560,
  hectare: 107639.104167,
};

const SETTING_ON_COUNTRY: Record<LandSetting, number> = {
  prime: 6.5,
  urban: 2.8,
  suburban: 1,
  town: 0.35,
  agricultural: 0.004,
  remote: 0.0012,
};

const SETTING_ON_MARKET: Record<LandSetting, number> = {
  prime: 1,
  urban: 0.38,
  suburban: 0.14,
  town: 0.05,
  agricultural: 0.004,
  remote: 0.0012,
};

const WORLD_SUBURBAN_USD = 2.5;

export function toSqft(area: number, unit: AreaUnit): number {
  return Math.max(0, area) * SQFT_PER_UNIT[unit];
}

export function normPlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchCountry(input: string): { country: CountryRate | null; suggestions: string[] } {
  const q = normPlace(input);
  if (!q) return { country: null, suggestions: [] };
  const exact = COUNTRIES.find((c) => normPlace(c.name) === q || c.aliases.some((a) => normPlace(a) === q));
  if (exact) return { country: exact, suggestions: [] };
  const hits = COUNTRIES.filter((c) => {
    const name = normPlace(c.name);
    return (q.length >= 4 && name.startsWith(q)) || (q.length >= 5 && name.includes(q));
  });
  if (hits.length === 1) return { country: hits[0], suggestions: [] };
  return { country: null, suggestions: hits.slice(0, 5).map((c) => c.name) };
}

function matchMarket(place: string, countryName: string | null) {
  const q = normPlace(place);
  if (q.length < 3) return null;
  const hits = KNOWN_MARKETS.filter((m) => {
    const name = normPlace(m.name);
    const hit = q === name || (name.length >= 4 && q.includes(name));
    if (!hit) return false;
    if (countryName && m.country !== countryName) return false;
    return true;
  });
  hits.sort((a, b) => normPlace(b.name).length - normPlace(a.name).length);
  return hits[0] ?? null;
}

export function quoteLand(opts: {
  country: string;
  place?: string;
  setting?: LandSetting;
  use?: LandUse;
  area: number;
  unit?: AreaUnit;
  waterfront?: boolean;
}): {
  usd: number;
  usdPerSqft: number;
  areaSqft: number;
  notes: string[];
  countryName: string | null;
  marketName: string | null;
  suggestions: string[];
  ready: boolean;
} {
  const setting = opts.setting ?? "suburban";
  const use = opts.use ?? "residential";
  const unit = opts.unit ?? "sqft";
  const areaSqft = toSqft(opts.area, unit);
  const named = matchCountry(opts.country);
  let country = named.country;
  let market = country ? matchMarket(opts.place ?? "", country.name) : null;
  if (!opts.country.trim()) {
    market = matchMarket(opts.place ?? "", null);
    if (market) country = COUNTRIES.find((c) => c.name === market?.country) ?? null;
  }

  const areaReady = areaSqft > 0;
  const namedSomething = Boolean(country || market || opts.country.trim() || (opts.place ?? "").trim());
  if (!namedSomething) {
    return {
      usd: 0,
      usdPerSqft: 0,
      areaSqft,
      countryName: null,
      marketName: null,
      suggestions: [],
      ready: false,
      notes: ["Enter a country or a place. Any country name is accepted."],
    };
  }

  const unlisted = !country;
  const band = country?.usdPerSqft ?? WORLD_SUBURBAN_USD;
  const base = market ? market.primeUsdPerSqft * SETTING_ON_MARKET[setting] : band * SETTING_ON_COUNTRY[setting];

  let useMult = 1;
  if (use === "commercial") useMult = setting === "prime" || setting === "urban" ? 1.45 : setting === "suburban" ? 1.2 : 0.85;
  else if (use === "raw") useMult = 0.62;
  else if (use === "agricultural" && setting !== "agricultural" && setting !== "remote") useMult = 0.7;

  const waterMult = opts.waterfront ? (setting === "agricultural" || setting === "remote" ? 1.12 : 1.35) : 1;
  const usdPerSqft = base * useMult * waterMult;
  const usd = usdPerSqft * areaSqft;

  const notes = [
    market
      ? `${market.name} prime anchor ${Math.round(market.primeUsdPerSqft).toLocaleString("en")} USD/sq ft, scaled for ${setting} land.`
      : `${country?.name ?? "Unlisted country"} suburban band ${(country?.usdPerSqft ?? WORLD_SUBURBAN_USD).toLocaleString("en")} USD/sq ft, scaled for ${setting} land.`,
    market
      ? "Naming a market prices land in that market. For a village or farm outside it, clear the place or type that town."
      : "No named market for this place, so the country band and the setting set the rate.",
    `Land use ${use}${opts.waterfront ? ", with water access" : ""}. ${Math.round(areaSqft).toLocaleString("en")} sq ft.`,
    "Reference model only. Not a survey, title search, or live market quote.",
  ];
  if (unlisted) {
    const typed = opts.country.trim() || (opts.place ?? "").trim();
    notes.unshift(
      `“${typed}” has no dedicated country band, so a world median suburban rate of ${WORLD_SUBURBAN_USD} USD/sq ft is scaled to the setting. Pick a suggested country if one matches.`,
    );
  }

  return {
    usd,
    usdPerSqft,
    areaSqft,
    notes,
    countryName: country?.name ?? null,
    marketName: market?.name ?? null,
    suggestions: named.country ? [] : named.suggestions,
    ready: areaReady,
  };
}
