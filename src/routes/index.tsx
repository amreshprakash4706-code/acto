import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { catalogStats, featuredProperties } from "@/lib/fn/properties";
import type { PropertyCard } from "@/lib/atconiz/types";
import { PropertyTile } from "@/components/property/card";
import { Button } from "@/components/ui/button";
import { listFavorites, toggleFavorite } from "@/lib/fn/engagement";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [stats, setStats] = useState<{
    count: number;
    cities: number;
    types: number;
    cityPreview?: { city: string; country: string; count: number }[];
  } | null>(null);
  const [featured, setFeatured] = useState<PropertyCard[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const { user } = useCurrentUserState();

  useEffect(() => {
    catalogStats().then(setStats).catch(() => setStats({ count: 0, cities: 0, types: 0 }));
    featuredProperties().then(setFeatured).catch(() => setFeatured([]));
  }, []);
  useEffect(() => {
    if (!user) return;
    listFavorites().then(setFavs).catch(() => setFavs([]));
  }, [user]);

  async function onFav(id: string) {
    if (!user) {
      toast.message("Sign in to save residences.");
      return;
    }
    try {
      const r = await toggleFavorite({ data: { propertyId: id } });
      setFavs((prev) => (r.saved ? [...prev, id] : prev.filter((x) => x !== id)));
    } catch {
      toast.error("Could not update saved homes.");
    }
  }

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 12% 20%, color-mix(in oklab, var(--color-accent) 16%, transparent), transparent 55%), radial-gradient(700px 400px at 88% 10%, color-mix(in oklab, var(--color-champagne) 12%, transparent), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-5 py-24 md:px-8 md:py-36">
          <p className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
            <span className="size-1.5 rounded-full bg-accent" />
            Atconiz Intelligence · 2026
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.8rem,8vw,5.4rem)] leading-[0.95]">
            Your next home is already waiting for you.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            A private operating layer for exceptional real estate — search, value, compare, and act on a
            curated reference catalog.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/explore">Browse residences</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/studio">Talk to Intelligence</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-[1280px] px-5 md:px-8">
        <div className="grid gap-6 rounded-xl border border-border bg-bg-elevated p-8 md:grid-cols-4">
          {[
            ["Reference listings", stats ? String(stats.count) : "—"],
            ["Cities in catalog", stats ? String(stats.cities) : "—"],
            ["Property types", stats ? String(stats.types) : "—"],
            ["Data source", "Reference seed"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{k}</p>
              <p className="mt-1 font-display text-4xl tabular">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-subtle">
          Inventory is demonstration catalog data. It is not a verified live listing feed.
        </p>
      </section>

      {stats?.cityPreview?.length ? (
        <section className="mx-auto max-w-[1280px] px-5 pt-14 md:px-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Catalog markets</p>
          <h2 className="mt-2 font-display text-4xl">Where the reference set lives</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {stats.cityPreview.map((c) => (
              <Link
                key={c.city}
                to="/market"
                search={{ city: c.city }}
                className="rounded-full border border-border px-4 py-2 text-sm hover:border-accent"
              >
                {c.city}
                <span className="ml-2 text-muted tabular">{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1480px] px-5 py-20 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Curated</p>
            <h2 className="font-display text-4xl">Featured residences</h2>
          </div>
          <Button asChild variant="secondary">
            <Link to="/explore">
              View all <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((p) => (
            <PropertyTile key={p.id} property={p} favorited={favs.includes(p.id)} onFavorite={onFav} />
          ))}
        </div>
      </section>
    </div>
  );
}
