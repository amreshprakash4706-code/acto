import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { ensureCatalog } from "@/lib/server/seed";
import { mapProperty } from "@/lib/server/map";
import { rankProperties } from "@/lib/atconiz/ranking";
import { parseNaturalQuery } from "@/lib/atconiz/nl-search";
import { valueProperty, selectComps } from "@/lib/atconiz/valuation";
import { track } from "@/lib/server/notify";
import type { PropertyCard, SearchQuery } from "@/lib/atconiz/types";
import { convertAmount } from "@/lib/atconiz/format";
import { asNumber, asString } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  type: z.string().optional(),
  listingType: z.enum(["SALE", "RENT"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minBeds: z.number().optional(),
  minBaths: z.number().optional(),
  minArea: z.number().optional(),
  amenity: z.string().optional(),
  featured: z.boolean().optional(),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc", "area-desc", "relevance"]).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  natural: z.boolean().optional(),
});

async function loadImages(ids: string[]) {
  const map = new Map<string, PropertyCard["images"]>();
  if (!ids.length) return map;
  const sql = await getSql();
  const rows = await sql<{
    property_id: string;
    url: string;
    alt_text: string | null;
    room_type: string | null;
  }>`select property_id, url, alt_text, room_type from property_images order by sort_order asc`;
  const allow = new Set(ids);
  for (const r of rows) {
    if (!allow.has(r.property_id)) continue;
    const list = map.get(r.property_id) ?? [];
    list.push({ url: r.url, altText: r.alt_text, roomType: r.room_type });
    map.set(r.property_id, list);
  }
  return map;
}

async function loadStats(ids: string[]) {
  const empty = {
    rating: new Map<string, number>(),
    reviews: new Map<string, number>(),
    views: new Map<string, number>(),
    favs: new Map<string, number>(),
  };
  if (!ids.length) return empty;
  const sql = await getSql();
  const allow = new Set(ids);
  const reviews = await sql<{ property_id: string; c: number; avg: number }>`
    select property_id, count(*)::int as c, avg(rating)::float as avg
    from reviews where moderation_status = 'APPROVED'
    group by property_id
  `;
  const views = await sql<{ property_id: string; c: number }>`
    select property_id, count(*)::int as c from property_views group by property_id
  `;
  const favs = await sql<{ property_id: string; c: number }>`
    select property_id, count(*)::int as c from favorites group by property_id
  `;
  for (const r of reviews) {
    if (!allow.has(r.property_id)) continue;
    empty.reviews.set(r.property_id, asNumber(r.c));
    empty.rating.set(r.property_id, asNumber(r.avg));
  }
  for (const r of views) if (allow.has(r.property_id)) empty.views.set(r.property_id, asNumber(r.c));
  for (const r of favs) if (allow.has(r.property_id)) empty.favs.set(r.property_id, asNumber(r.c));
  return empty;
}

export async function fetchAllActive(): Promise<PropertyCard[]> {
  await ensureCatalog();
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select * from properties
    where deleted_at is null and status = 'ACTIVE'
    order by is_featured desc, published_at desc nulls last
  `;
  const ids = rows.map((r) => asString(r.id));
  const [images, stats] = await Promise.all([loadImages(ids), loadStats(ids)]);
  return rows.map((r) => {
    const id = asString(r.id);
    return mapProperty(r, {
      images: images.get(id) ?? [],
      rating: stats.rating.get(id) ?? null,
      reviewCount: stats.reviews.get(id) ?? 0,
      viewCount: stats.views.get(id) ?? 0,
      favoriteCount: stats.favs.get(id) ?? 0,
    });
  });
}

function applyFilters(all: PropertyCard[], q: SearchQuery): PropertyCard[] {
  return all.filter((p) => {
    if (q.city && p.city.toLowerCase() !== q.city.toLowerCase()) return false;
    if (q.country && p.country.toLowerCase() !== q.country.toLowerCase()) return false;
    if (q.type && p.propertyType.toLowerCase() !== q.type.toLowerCase()) return false;
    if (q.listingType && p.listingType !== q.listingType) return false;
    if (q.minPrice != null && convertAmount(p.price, p.currency, "USD") < q.minPrice) return false;
    if (q.maxPrice != null && convertAmount(p.price, p.currency, "USD") > q.maxPrice) return false;
    if (q.minBeds != null && (p.bedrooms ?? 0) < q.minBeds) return false;
    if (q.minBaths != null && (p.bathrooms ?? 0) < q.minBaths) return false;
    if (q.minArea != null && (p.areaSqft ?? 0) < q.minArea) return false;
    if (q.featured && !p.isFeatured) return false;
    if (q.amenity && !p.amenities.some((a) => a.toLowerCase().includes(q.amenity!.toLowerCase())))
      return false;
    return true;
  });
}

function keywordNarrow(items: PropertyCard[], q?: string): PropertyCard[] {
  if (!q?.trim()) return items;
  const stop = new Set([
    "under", "below", "less", "than", "maximum", "max", "over", "above", "more", "minimum", "min",
    "bed", "beds", "bedroom", "bedrooms", "bath", "baths", "bathroom", "rent", "rental", "lease",
    "buy", "sale", "purchase", "the", "and", "for", "with", "from", "per", "month", "year",
    "million", "sqft", "feet", "square", "home", "property", "usd", "aed",
  ]);
  const tokens = q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !stop.has(t) && !/^\d+$/.test(t));
  if (!tokens.length) return items;
  return items.filter((p) => {
    const text = [p.title, p.neighborhood, p.city, p.country, p.propertyType, p.description, ...p.amenities]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return tokens.some((t) => text.includes(t));
  });
}

export const listProperties = createServerFn({ method: "GET" })
  .validator(searchSchema.optional())
  .handler(async ({ data }) => {
    const raw = data ?? {};
    const explicit = Object.fromEntries(
      Object.entries(raw).filter(([, value]) => value !== undefined && value !== ""),
    );
    const parsed = raw.natural && raw.q ? { ...parseNaturalQuery(raw.q), ...explicit } : raw;
    const all = await fetchAllActive();
    const filtered = keywordNarrow(applyFilters(all, parsed), parsed.q);
    const ranked = rankProperties(filtered, parsed);
    const sort = parsed.sort ?? (parsed.q ? "relevance" : "featured");
    const sorted = [...ranked];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "area-desc") sorted.sort((a, b) => (b.areaSqft ?? 0) - (a.areaSqft ?? 0));
    else if (sort === "newest") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "featured")
      sorted.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.rankScore - a.rankScore);

    const offset = parsed.offset ?? 0;
    const limit = Math.min(parsed.limit ?? 24, 60);
    const items = sorted.slice(offset, offset + limit);
    return {
      items,
      total: sorted.length,
      parsedQuery: parsed,
      cities: [...new Set(all.map((p) => p.city))].sort(),
      countries: [...new Set(all.map((p) => p.country))].sort(),
      types: [...new Set(all.map((p) => p.propertyType))].sort(),
    };
  });

export const getProperty = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await ensureCatalog();
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from properties where (id = ${data.id} or slug = ${data.id}) and deleted_at is null limit 1
    `;
    if (!rows[0]) return { property: null, similar: [] as PropertyCard[], comps: [] as PropertyCard[] };
    const all = await fetchAllActive();
    const property = all.find((p) => p.id === asString(rows[0].id) || p.slug === data.id) ?? null;
    if (!property) return { property: null, similar: [], comps: [] };
    await sql`
      insert into property_views (id, property_id, session_id)
      values (${`vw_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`}, ${property.id}, ${"anon"})
    `;
    await track({ name: "property_view", payload: { propertyId: property.id } });
    const similar = rankProperties(
      all.filter((p) => p.id !== property.id),
      { type: property.propertyType, city: property.city },
    ).slice(0, 4);
    const comps = selectComps(property, all, 4);
    return { property, similar, comps };
  });

export const valueForProperty = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const all = await fetchAllActive();
    const subject = all.find((p) => p.id === data.id);
    if (!subject) return null;
    return valueProperty(subject, all);
  });

export const catalogStats = createServerFn({ method: "GET" }).handler(async () => {
  const all = await fetchAllActive();
  const cities = new Set(all.map((p) => p.city));
  const types = new Set(all.map((p) => p.propertyType));
  const featured = all.filter((p) => p.isFeatured);
  const byCity = new Map<string, { city: string; country: string; count: number }>();
  for (const p of all) {
    const row = byCity.get(p.city) ?? { city: p.city, country: p.country, count: 0 };
    row.count += 1;
    byCity.set(p.city, row);
  }
  return {
    count: all.length,
    cities: cities.size,
    types: types.size,
    featured: featured.length,
    provenance: "SEED_DEVELOPMENT",
    cityPreview: [...byCity.values()].sort((a, b) => b.count - a.count),
  };
});

export const featuredProperties = createServerFn({ method: "GET" }).handler(async () => {
  const all = await fetchAllActive();
  return all.filter((p) => p.isFeatured).slice(0, 6);
});
