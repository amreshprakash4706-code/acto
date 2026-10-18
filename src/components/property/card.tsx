import { Link } from "@tanstack/react-router";
import { Heart, GitCompareArrows, MapPin } from "lucide-react";
import type { PropertyCard } from "@/lib/atconiz/types";
import { provenanceLabel } from "@/lib/atconiz/format";
import { useAppStore } from "@/lib/atconiz/store";
import { Badge } from "@/components/ui/badge";
import { Price } from "./price";
import { cn } from "@/lib/utils";

export function PropertyTile({
  property,
  onFavorite,
  favorited,
}: {
  property: PropertyCard;
  onFavorite?: (id: string) => void;
  favorited?: boolean;
}) {
  const compareIds = useAppStore((s) => s.compareIds);
  const toggleCompare = useAppStore((s) => s.toggleCompare);
  const compared = compareIds.includes(property.id);

  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-bg-elevated">
      <Link to="/properties/$id" params={{ id: property.id }} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-bg-subtle">
          {property.primaryImage ? (
            <img
              src={property.primaryImage}
              alt={property.title}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="grid size-full place-items-center text-sm text-muted">No image</div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="border-0 bg-bg/80 text-fg backdrop-blur-sm">{property.propertyType}</Badge>
            {property.listingType === "RENT" ? (
              <Badge className="border-0 bg-champagne/90 text-accent-fg">Lease</Badge>
            ) : null}
          </div>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to="/properties/$id" params={{ id: property.id }} className="font-display text-xl leading-tight text-fg">
              {property.title}
            </Link>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5" />
              {property.neighborhood ? `${property.neighborhood}, ` : ""}
              {property.city}
            </p>
          </div>
          <p className="text-right font-medium text-champagne">
            <Price
              amount={property.price}
              currency={property.currency}
              compact
              period={property.pricePeriod}
            />
          </p>
        </div>
        <p className="text-sm text-muted">
          {property.bedrooms ?? "—"} bed · {property.bathrooms ?? "—"} bath ·{" "}
          {property.areaSqft ? `${Math.round(property.areaSqft).toLocaleString("en")} sq ft` : "—"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.14em] text-subtle">
            {provenanceLabel(property.provenance)}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label={compared ? "Remove from compare" : "Add to compare"}
              onClick={() => toggleCompare(property.id)}
              className={cn(
                "grid size-10 place-items-center rounded-full border border-border",
                compared && "bg-bg-subtle text-accent",
              )}
            >
              <GitCompareArrows className="size-4" />
            </button>
            <button
              type="button"
              aria-label={favorited ? "Remove saved home" : "Save home"}
              onClick={() => onFavorite?.(property.id)}
              className={cn(
                "grid size-10 place-items-center rounded-full border border-border",
                favorited && "text-accent",
              )}
            >
              <Heart className={cn("size-4", favorited && "fill-accent")} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
