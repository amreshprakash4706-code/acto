export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type Role = "USER" | "AGENT" | "ADMIN";
export type PropertyStatus = "DRAFT" | "ACTIVE" | "SOLD" | "LEASED" | "ARCHIVED";
export type ListingType = "SALE" | "RENT";
export type ViewingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";
export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "VIEWING"
  | "NEGOTIATING"
  | "WON"
  | "LOST";

export type PropertyCard = {
  id: string;
  title: string;
  slug: string;
  description: string;
  propertyType: string;
  status: PropertyStatus;
  listingType: ListingType;
  price: number;
  currency: string;
  pricePeriod: "sale" | "month" | "year";
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  plotSqft: number | null;
  yearBuilt: number | null;
  furnishing: string | null;
  city: string;
  neighborhood: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  features: Record<string, string | number | boolean>;
  provenance: string;
  verificationStatus: string;
  isFeatured: boolean;
  primaryImage: string | null;
  images: { url: string; altText: string | null; roomType: string | null }[];
  rating: number | null;
  reviewCount: number;
  viewCount: number;
  favoriteCount: number;
};

export type SearchQuery = {
  q?: string;
  city?: string;
  country?: string;
  type?: string;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minArea?: number;
  amenity?: string;
  featured?: boolean;
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "area-desc" | "relevance";
  limit?: number;
  offset?: number;
};

export type RankedProperty = PropertyCard & {
  rankScore: number;
  rankReasons: string[];
};

export type ValuationResult = {
  propertyId: string;
  estimatedValue: number;
  currency: string;
  low: number;
  high: number;
  confidence: "low" | "medium" | "high";
  method: string;
  ppsf: number | null;
  comps: { id: string; title: string; price: number; currency: string; city: string; areaSqft: number | null; distanceHint: string }[];
  positives: string[];
  negatives: string[];
  assumptions: string[];
  asOf: string;
  modelVersion: string;
};

export type Profile = {
  userId: string;
  displayName: string | null;
  phone: string | null;
  role: Role;
  bio: string | null;
  agencyName: string | null;
  plan: string;
  preferences: Record<string, string | number | boolean>;
};
