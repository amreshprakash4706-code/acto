import type { PropertyCard, ValuationResult } from "./types";
import { estimateLandValue } from "./land";

const MODEL_VERSION = "atconiz-comps-v1";

function ppsf(p: PropertyCard): number | null {
  if (!p.areaSqft || p.areaSqft <= 0) return null;
  if (p.listingType === "RENT") {
    const annual = p.pricePeriod === "year" ? p.price : p.price * 12;
    return annual / p.areaSqft;
  }
  return p.price / p.areaSqft;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function selectComps(subject: PropertyCard, inventory: PropertyCard[], limit = 5): PropertyCard[] {
  return inventory
    .filter((p) => p.id !== subject.id && p.listingType === subject.listingType && p.status === "ACTIVE")
    .map((p) => {
      let score = 0;
      if (p.city === subject.city) score += 6;
      else if (p.country === subject.country) score += 2;
      if (p.propertyType === subject.propertyType) score += 3;
      if (subject.bedrooms != null && p.bedrooms != null) {
        score += Math.max(0, 3 - Math.abs(p.bedrooms - subject.bedrooms));
      }
      if (subject.areaSqft && p.areaSqft) {
        const rel = Math.abs(p.areaSqft - subject.areaSqft) / subject.areaSqft;
        score += Math.max(0, 3 - rel * 6);
      }
      return { p, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

export function valueProperty(subject: PropertyCard, inventory: PropertyCard[]): ValuationResult {
  const comps = selectComps(subject, inventory);
  const positives: string[] = [];
  const negatives: string[] = [];
  const assumptions: string[] = [
    "Estimate is derived from Atconiz catalog comparables and reference land rates.",
    "Not a licensed appraisal, bank underwrite, or live market quote.",
  ];

  const subjectPpsf = ppsf(subject);
  const compPpsfs = comps.map(ppsf).filter((v): v is number => v != null && v > 0);
  let estimated: number;
  let method: string;
  let confidence: ValuationResult["confidence"] = "low";

  if (compPpsfs.length >= 2 && subject.areaSqft) {
    const med = median(compPpsfs);
    let adj = 1;
    const medianBeds = median(comps.map((c) => c.bedrooms ?? 0).filter(Boolean));
    if (subject.bedrooms != null && medianBeds) {
      adj += (subject.bedrooms - medianBeds) * 0.03;
    }
    if (subject.yearBuilt && subject.yearBuilt >= 2018) {
      adj += 0.04;
      positives.push("Newer construction relative to typical catalog stock.");
    } else if (subject.yearBuilt && subject.yearBuilt < 1990) {
      adj -= 0.05;
      negatives.push("Older vintage — condition and capex are unknown.");
    }
    if (subject.amenities.includes("Waterfront") || subject.amenities.includes("Sea view")) {
      adj += 0.06;
      positives.push("Waterfront / sea-view amenity premium applied.");
    }
    if (subject.isFeatured) adj += 0.02;
    estimated =
      subject.listingType === "RENT" && subject.pricePeriod === "month"
        ? (med * subject.areaSqft) / 12
        : med * subject.areaSqft * adj;
    method = `Comparable ppsf (${compPpsfs.length} comps) with attribute adjustments`;
    confidence = comps.length >= 4 ? "high" : "medium";
    assumptions.push(`Median comparable rate ${med.toFixed(0)} per sq ft in listing currency units.`);
  } else {
    const land = estimateLandValue({
      country: subject.country,
      city: subject.city,
      type: subject.propertyType,
      areaSqft: subject.areaSqft ?? 2000,
      premium: 6,
    });
    estimated = land.usd;
    method = "Reference land-rate fallback (insufficient comps)";
    confidence = "low";
    assumptions.push(...land.notes);
    negatives.push("Fewer than two close comparables in the catalog.");
  }

  if (subject.provenance === "SEED_DEVELOPMENT" || subject.provenance === "REFERENCE") {
    assumptions.push("Subject record is reference catalog data, not a verified live listing.");
  }

  const spread = confidence === "high" ? 0.08 : confidence === "medium" ? 0.14 : 0.22;
  const asOf = new Date().toISOString().slice(0, 10);

  return {
    propertyId: subject.id,
    estimatedValue: Math.round(estimated),
    currency: subject.currency,
    low: Math.round(estimated * (1 - spread)),
    high: Math.round(estimated * (1 + spread)),
    confidence,
    method,
    ppsf: subjectPpsf,
    comps: comps.map((c) => ({
      id: c.id,
      title: c.title,
      price: c.price,
      currency: c.currency,
      city: c.city,
      areaSqft: c.areaSqft,
      distanceHint: c.city === subject.city ? "Same city" : c.country === subject.country ? "Same country" : "Regional",
    })),
    positives,
    negatives,
    assumptions,
    asOf,
    modelVersion: MODEL_VERSION,
  };
}
