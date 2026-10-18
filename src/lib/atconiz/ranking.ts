import type { PropertyCard, RankedProperty, SearchQuery } from "./types";

function haystack(p: PropertyCard): string {
  return [
    p.title,
    p.city,
    p.neighborhood,
    p.country,
    p.propertyType,
    p.description,
    p.amenities.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function rankProperties(
  items: PropertyCard[],
  query: SearchQuery,
  prefs?: { cities?: string[]; types?: string[]; maxPrice?: number },
): RankedProperty[] {
  const tokens = (query.q ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  return items
    .map((p) => {
      let score = 12;
      const reasons: string[] = [];
      const text = haystack(p);

      if (tokens.length) {
        const hits = tokens.filter((t) => text.includes(t)).length;
        const rel = hits / tokens.length;
        score += rel * 40;
        if (rel > 0.5) reasons.push("Text match");
      }
      if (p.isFeatured) {
        score += 8;
        reasons.push("Featured");
      }
      if (prefs?.cities?.includes(p.city)) {
        score += 10;
        reasons.push("Matches preferred city");
      }
      if (prefs?.types?.includes(p.propertyType)) {
        score += 6;
        reasons.push("Matches preferred type");
      }
      if (prefs?.maxPrice && p.listingType === "SALE" && p.price <= prefs.maxPrice) {
        score += 5;
        reasons.push("Inside budget");
      }
      if (query.minBeds && p.bedrooms && p.bedrooms >= query.minBeds) score += 4;
      if (query.amenity && p.amenities.some((a) => a.toLowerCase().includes(query.amenity!.toLowerCase()))) {
        score += 6;
        reasons.push(`Has ${query.amenity}`);
      }
      const ageHours = 0;
      score += Math.max(0, 5 - ageHours);
      if (p.reviewCount > 0 && (p.rating ?? 0) >= 4.5) {
        score += 3;
        reasons.push("Strong reviews");
      }
      return { ...p, rankScore: score, rankReasons: reasons };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}
