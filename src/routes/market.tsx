import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { marketOverview } from "@/lib/fn/market";
import { listProperties } from "@/lib/fn/properties";
import { formatCompactMoney } from "@/lib/atconiz/format";
import type { PropertyCard } from "@/lib/atconiz/types";
import { PropertyTile } from "@/components/property/card";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const searchSchema = z.object({ city: z.string().optional() });

export const Route = createFileRoute("/market")({
  validateSearch: searchSchema,
  component: Market,
});

function Market() {
  const { city } = Route.useSearch();
  const navigate = useNavigate({ from: "/market" });
  const [data, setData] = useState<Awaited<ReturnType<typeof marketOverview>> | null>(null);
  const [homes, setHomes] = useState<PropertyCard[]>([]);

  useEffect(() => {
    marketOverview().then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    if (!city) {
      setHomes([]);
      return;
    }
    listProperties({ data: { city, limit: 12, sort: "featured" } })
      .then((r) => setHomes(r.items))
      .catch(() => setHomes([]));
  }, [city]);

  if (!data) return <div className="p-10 text-muted">Loading market snapshot…</div>;

  const selected = data.cities.find((c) => c.city === city) ?? null;

  function pick(next: string) {
    navigate({ search: { city: next === city ? undefined : next } });
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-12 md:px-8">
      <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Catalog intelligence</p>
      <h1 className="mt-2 font-display text-5xl">Markets</h1>
      <p className="mt-3 max-w-2xl text-muted">{data.note}</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Active records", data.listings],
          ["For sale", data.saleListings],
          ["For lease", data.rentListings],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl border border-border p-6">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{k}</p>
            <p className="mt-2 font-display text-4xl tabular">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {data.cities.map((c) => (
          <button
            key={c.city}
            type="button"
            onClick={() => pick(c.city)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              city === c.city ? "border-accent bg-bg-subtle text-fg" : "border-border text-muted"
            }`}
          >
            {c.city}
            <span className="ml-2 tabular text-xs">{c.listings}</span>
          </button>
        ))}
      </div>

      {selected ? (
        <section className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-accent">{selected.country}</p>
              <h2 className="font-display text-4xl">{selected.city}</h2>
              <p className="mt-2 text-sm text-muted">
                {selected.saleCount} for sale · {selected.rentCount} for lease. Sale figures are converted to USD with
                the reference rates, not a live index.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link to="/explore" search={{ city: selected.city }}>
                Open in Explore
              </Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {[
              ["Low sale", formatCompactMoney(selected.minUsd, "USD")],
              ["Median sale", formatCompactMoney(selected.medianUsd, "USD")],
              ["High sale", formatCompactMoney(selected.maxUsd, "USD")],
              ["Avg USD / sq ft", selected.avgPpsf ? `$${selected.avgPpsf.toLocaleString("en")}` : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs uppercase tracking-[0.14em] text-muted">{k}</p>
                <p className="mt-1 font-display text-3xl tabular">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {selected.typeCounts.map((t) => (
              <Link
                key={t.type}
                to="/explore"
                search={{ city: selected.city, type: t.type }}
                className="rounded-full border border-border px-3 py-1 text-sm"
              >
                {t.type} · {t.count}
              </Link>
            ))}
          </div>
          {selected.neighborhoods.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.neighborhoods.map((n) => (
                <Link
                  key={n}
                  to="/explore"
                  search={{ city: selected.city, q: n }}
                  className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
                >
                  {n}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {homes.map((p) => (
              <PropertyTile key={p.id} property={p} />
            ))}
          </div>
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted">Select a city to see its range, neighborhoods, and residences.</p>
      )}

      <div className="mt-10 h-80 rounded-xl border border-border p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.cities}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="city" stroke="var(--color-muted)" fontSize={12} />
            <YAxis stroke="var(--color-muted)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)" }}
              formatter={(v) => formatCompactMoney(Number(v), "USD")}
            />
            <Bar dataKey="avgUsd" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="p-3">City</th>
              <th className="p-3">Country</th>
              <th className="p-3">Listings</th>
              <th className="p-3">Median sale</th>
              <th className="p-3">Avg sale</th>
              <th className="p-3">Avg USD / sq ft</th>
            </tr>
          </thead>
          <tbody>
            {data.cities.map((c) => (
              <tr
                key={c.city}
                className={`cursor-pointer border-t border-border ${city === c.city ? "bg-bg-subtle" : ""}`}
                onClick={() => pick(c.city)}
              >
                <td className="p-3">{c.city}</td>
                <td className="p-3">{c.country}</td>
                <td className="p-3 tabular">{c.listings}</td>
                <td className="p-3 tabular">{formatCompactMoney(c.medianUsd, "USD")}</td>
                <td className="p-3 tabular">{formatCompactMoney(c.avgUsd, "USD")}</td>
                <td className="p-3 tabular">{c.avgPpsf || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
