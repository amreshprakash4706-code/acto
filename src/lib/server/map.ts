import { asNumber, asRecord, asString, asStringArray } from "@/lib/utils";
import type { PropertyCard, PropertyStatus, ListingType } from "@/lib/atconiz/types";

export function mapProperty(row: Record<string, unknown>, extras?: {
  images?: { url: string; altText: string | null; roomType: string | null }[];
  rating?: number | null;
  reviewCount?: number;
  viewCount?: number;
  favoriteCount?: number;
}): PropertyCard {
  const images = extras?.images ?? [];
  const primary = images[0]?.url ?? null;
  return {
    id: asString(row.id),
    title: asString(row.title),
    slug: asString(row.slug),
    description: asString(row.description),
    propertyType: asString(row.property_type),
    status: asString(row.status, "ACTIVE") as PropertyStatus,
    listingType: asString(row.listing_type, "SALE") as ListingType,
    price: asNumber(row.price),
    currency: asString(row.currency, "USD"),
    pricePeriod: (asString(row.price_period, "sale") as "sale" | "month" | "year"),
    bedrooms: row.bedrooms == null ? null : asNumber(row.bedrooms),
    bathrooms: row.bathrooms == null ? null : asNumber(row.bathrooms),
    areaSqft: row.area_sqft == null ? null : asNumber(row.area_sqft),
    plotSqft: row.plot_sqft == null ? null : asNumber(row.plot_sqft),
    yearBuilt: row.year_built == null ? null : asNumber(row.year_built),
    furnishing: row.furnishing == null ? null : asString(row.furnishing),
    city: asString(row.city),
    neighborhood: row.neighborhood == null ? null : asString(row.neighborhood),
    state: row.state == null ? null : asString(row.state),
    country: asString(row.country),
    latitude: row.latitude == null ? null : asNumber(row.latitude),
    longitude: row.longitude == null ? null : asNumber(row.longitude),
    amenities: asStringArray(row.amenities),
    features: asRecord(row.features),
    provenance: asString(row.provenance, "REFERENCE"),
    verificationStatus: asString(row.verification_status, "unverified"),
    isFeatured: Boolean(row.is_featured),
    primaryImage: primary,
    images,
    rating: extras?.rating ?? null,
    reviewCount: extras?.reviewCount ?? 0,
    viewCount: extras?.viewCount ?? 0,
    favoriteCount: extras?.favoriteCount ?? 0,
  };
}
