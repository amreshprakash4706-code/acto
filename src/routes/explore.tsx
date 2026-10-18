import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listProperties } from "@/lib/fn/properties";
import { listFavorites, saveSearch, toggleFavorite } from "@/lib/fn/engagement";
import type { PropertyCard } from "@/lib/atconiz/types";
import { PropertyTile } from "@/components/property/card";
import { ConstellationMap } from "@/components/property/constellation-map";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  type: z.string().optional(),
  listingType: z.enum(["SALE", "RENT"]).optional(),
  minBeds: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
});

export const Route = createFileRoute("/explore")({
  validateSearch: searchSchema,
  component: Explore,
});

function Explore() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const { user } = useCurrentUserState();
  const [q, setQ] = useState(search.q ?? "");
  const [city, setCity] = useState(search.city ?? "");
  const [type, setType] = useState(search.type ?? "");
  const [listingType, setListingType] = useState(search.listingType ?? "");
  const [minBeds, setMinBeds] = useState(search.minBeds ?? "");
  const [minPrice, setMinPrice] = useState(search.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(search.maxPrice ?? "");
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "relevance">("featured");
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [total, setTotal] = useState(0);
  const [cities, setCities] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listProperties({
      data: {
        q: q || undefined,
        city: city || undefined,
        type: type || undefined,
        listingType: listingType === "SALE" || listingType === "RENT" ? listingType : undefined,
        minBeds: minBeds ? Number(minBeds) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort,
        natural: true,
        limit: 48,
      },
    })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        setCities(r.cities);
        setTypes(r.types);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [q, city, type, listingType, minBeds, minPrice, maxPrice, sort]);

  useEffect(() => {
    if (!user) return;
    listFavorites().then(setFavs).catch(() => setFavs([]));
  }, [user]);

  async function onFav(id: string) {
    if (!user) return toast.message("Sign in to save residences.");
    try {
      const r = await toggleFavorite({ data: { propertyId: id } });
      setFavs((prev) => (r.saved ? [...prev, id] : prev.filter((x) => x !== id)));
    } catch {
      toast.error("Could not update saved homes.");
    }
  }

  const selectedProp = useMemo(() => items.find((p) => p.id === selected), [items, selected]);

  return (
    <div className="mx-auto max-w-[1480px] px-5 py-10 md:px-8">
      <h1 className="font-display text-4xl md:text-5xl">Discover residences</h1>
      <p className="mt-2 max-w-2xl text-muted">
        {total} matching records from the reference catalog. Words that are not a price or a bedroom count must appear
        on the residence. Price bounds are the asking amount converted to USD — a lease figure is the listed period, not
        an annualized rent.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              value={q}
              placeholder="Modern 3-bed in Dubai under 10 million"
              onChange={(e) => {
                setQ(e.target.value);
                navigate({ search: (s) => ({ ...s, q: e.target.value || undefined }) });
              }}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select id="type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="lt">Sale / lease</Label>
            <Select id="lt" value={listingType} onChange={(e) => setListingType(e.target.value)}>
              <option value="">All</option>
              <option value="SALE">Sale</option>
              <option value="RENT">Lease</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="minp">Min USD</Label>
            <Input
              id="minp"
              inputMode="numeric"
              placeholder="1000000"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div>
            <Label htmlFor="maxp">Max USD</Label>
            <Input
              id="maxp"
              inputMode="numeric"
              placeholder="10000000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div>
            <Label htmlFor="beds">Beds</Label>
            <Select id="beds" value={minBeds} onChange={(e) => setMinBeds(e.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="featured">Featured</option>
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price · low</option>
            <option value="price-desc">Price · high</option>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant={mode === "list" ? "primary" : "secondary"} size="sm" onClick={() => setMode("list")}>
              List
            </Button>
            <Button type="button" variant={mode === "map" ? "primary" : "secondary"} size="sm" onClick={() => setMode("map")}>
              Map
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={async () => {
                if (!user) return toast.message("Sign in to save this search.");
                try {
                  await saveSearch({
                    data: {
                      name: q || `${city || "All cities"} search`,
                      query: {
                        ...(q ? { q } : {}),
                        ...(city ? { city } : {}),
                        ...(type ? { type } : {}),
                        ...(listingType ? { listingType } : {}),
                        ...(minBeds ? { minBeds } : {}),
                        ...(minPrice ? { minPrice: Number(minPrice) } : {}),
                        ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
                      },
                    },
                  });
                  toast.success("Search saved to your workspace.");
                } catch {
                  toast.error("Could not save search.");
                }
              }}
            >
              Save search
            </Button>
          </div>
        </div>
      </div>

      {mode === "map" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <ConstellationMap properties={items} selectedId={selected} onSelect={setSelected} />
          <div className="space-y-4">
            {selectedProp ? (
              <PropertyTile property={selectedProp} favorited={favs.includes(selectedProp.id)} onFavorite={onFav} />
            ) : (
              <p className="text-sm text-muted">Select a cluster, then a pin.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? <p className="text-muted">Loading catalog…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-muted">No residences match those filters. Relax a constraint and search again.</p>
          ) : null}
          {items.map((p) => (
            <PropertyTile key={p.id} property={p} favorited={favs.includes(p.id)} onFavorite={onFav} />
          ))}
        </div>
      )}
    </div>
  );
}
