import type { ListingType, SearchQuery } from "./types";

const TYPES = ["villa", "penthouse", "apartment", "townhouse", "estate", "loft", "house", "chalet"];
const CITIES = [
  "mumbai",
  "dubai",
  "london",
  "new york",
  "nyc",
  "singapore",
  "paris",
  "los angeles",
  "la",
  "tokyo",
  "sydney",
  "monaco",
  "hong kong",
  "delhi",
  "lisbon",
  "como",
  "brooklyn",
  "malibu",
  "beverly hills",
];

function parseAmount(raw: string, unit?: string): number {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  const u = (unit ?? "").toLowerCase();
  if (u === "cr" || u === "crore") return n * 10_000_000; // INR context — caller may still treat as local
  if (u === "lakh" || u === "l") return n * 100_000;
  if (u === "m" || u === "mn" || u === "million") return n * 1_000_000;
  if (u === "k" || u === "thousand") return n * 1_000;
  if (n > 0 && n < 1000 && !unit) return n * 1_000_000;
  return n;
}

export function parseNaturalQuery(text: string): SearchQuery & { remainder: string } {
  const q: SearchQuery = { q: text.trim() };
  const lower = text.toLowerCase();

  const bed = lower.match(/(\d+)\s*(?:bed|br|bedroom)/);
  if (bed) q.minBeds = Number(bed[1]);
  const bath = lower.match(/(\d+(?:\.\d)?)\s*(?:bath)/);
  if (bath) q.minBaths = Number(bath[1]);
  const area = lower.match(/(\d[\d,]*)\s*(?:sq\s?ft|sqft|square feet)/);
  if (area) q.minArea = Number(area[1].replace(/,/g, ""));

  const under = lower.match(
    /(?:under|below|less than|max(?:imum)?)\s*[₹$€£]?\s*([\d.,]+)\s*(k|m|mn|million|cr|crore|lakh|l)?/,
  );
  if (under) q.maxPrice = parseAmount(under[1], under[2]);
  const over = lower.match(
    /(?:over|above|more than|min(?:imum)?)\s*[₹$€£]?\s*([\d.,]+)\s*(k|m|mn|million|cr|crore|lakh|l)?/,
  );
  if (over) q.minPrice = parseAmount(over[1], over[2]);

  if (/\brent/.test(lower)) q.listingType = "RENT" as ListingType;
  if (/\bbuy\b|\bsale\b|\bpurchase\b/.test(lower)) q.listingType = "SALE";

  for (const t of TYPES) {
    if (lower.includes(t)) {
      q.type = t[0].toUpperCase() + t.slice(1);
      break;
    }
  }
  for (const c of CITIES) {
    if (lower.includes(c)) {
      if (c === "nyc" || c === "new york") q.city = "New York";
      else if (c === "la" || c === "los angeles") q.city = "Los Angeles";
      else if (c === "hong kong") q.city = "Hong Kong";
      else if (c === "beverly hills") q.city = "Los Angeles";
      else q.city = c.replace(/\b\w/g, (ch) => ch.toUpperCase());
      break;
    }
  }

  if (lower.includes("garden") || lower.includes("yard")) q.amenity = "Garden";
  else if (lower.includes("pool")) q.amenity = "Pool";
  else if (lower.includes("sea") || lower.includes("ocean") || lower.includes("waterfront"))
    q.amenity = "Waterfront";
  else if (lower.includes("school")) q.amenity = "Near schools";

  return { ...q, remainder: text };
}
