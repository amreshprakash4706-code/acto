import { useMemo, useState } from "react";
import type { PropertyCard } from "@/lib/atconiz/types";
import { Price } from "./price";
import { cn } from "@/lib/utils";

function project(lat: number, lng: number) {
  const x = (lng + 180) / 360;
  const latRad = (lat * Math.PI) / 180;
  const merc = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 0.5 - merc / (2 * Math.PI);
  return { x, y };
}

export function ConstellationMap({
  properties,
  selectedId,
  onSelect,
}: {
  properties: PropertyCard[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  const [focusCity, setFocusCity] = useState<string | null>(null);
  const geo = properties.filter((p) => p.latitude != null && p.longitude != null);

  const cities = useMemo(() => {
    const map = new Map<string, PropertyCard[]>();
    for (const p of geo) {
      const list = map.get(p.city) ?? [];
      list.push(p);
      map.set(p.city, list);
    }
    return [...map.entries()].map(([city, list]) => {
      const lat = list.reduce((s, p) => s + (p.latitude ?? 0), 0) / list.length;
      const lng = list.reduce((s, p) => s + (p.longitude ?? 0), 0) / list.length;
      return { city, list, ...project(lat, lng) };
    });
  }, [geo]);

  const view = focusCity ? geo.filter((p) => p.city === focusCity) : [];
  const bounds = useMemo(() => {
    if (!view.length) return null;
    const xs = view.map((p) => project(p.latitude!, p.longitude!).x);
    const ys = view.map((p) => project(p.latitude!, p.longitude!).y);
    return {
      minX: Math.min(...xs) - 0.01,
      maxX: Math.max(...xs) + 0.01,
      minY: Math.min(...ys) - 0.01,
      maxY: Math.max(...ys) + 0.01,
    };
  }, [view]);

  const selected = properties.find((p) => p.id === selectedId);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-bg">
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--color-accent) 16%, transparent), transparent 40%), radial-gradient(circle at 80% 70%, color-mix(in oklab, var(--color-champagne) 10%, transparent), transparent 35%)",
      }} />
      <svg viewBox="0 0 1000 640" className="relative block h-[min(70vh,640px)] w-full" role="img" aria-label="Catalog map">
        {cities.map((c) => (
          <g
            key={c.city}
            transform={`translate(${c.x * 1000} ${c.y * 640})`}
            className="cursor-pointer"
            onClick={() => setFocusCity(c.city)}
          >
            <circle r={10 + Math.min(12, c.list.length * 2)} fill="color-mix(in oklab, var(--color-accent) 35%, transparent)" stroke="var(--color-accent)" strokeWidth="1.2" />
            <text y={-16} textAnchor="middle" fill="var(--color-fg)" fontSize="12" fontFamily="Outfit, sans-serif">
              {c.city} · {c.list.length}
            </text>
          </g>
        ))}
        {bounds
          ? view.map((p) => {
              const { x, y } = project(p.latitude!, p.longitude!);
              const px = ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * 1000;
              const py = ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * 640;
              const active = p.id === selectedId;
              return (
                <g key={p.id} transform={`translate(${px} ${py})`} className="cursor-pointer" onClick={() => onSelect(p.id)}>
                  <circle r={active ? 8 : 5} fill={active ? "var(--color-champagne)" : "var(--color-accent)"} />
                </g>
              );
            })
          : null}
      </svg>
      <div className="absolute left-3 top-3 flex gap-2">
        <span className="rounded-full border border-border bg-bg/80 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted backdrop-blur-sm">
          {focusCity ?? "World catalog"}
        </span>
        {focusCity ? (
          <button
            type="button"
            className="rounded-full border border-border bg-bg/80 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-fg"
            onClick={() => setFocusCity(null)}
          >
            All cities
          </button>
        ) : null}
      </div>
      {selected ? (
        <div className={cn("absolute bottom-3 left-3 right-3 rounded-lg border border-border bg-bg-elevated/95 p-4 backdrop-blur-sm")}>
          <p className="font-display text-lg">{selected.title}</p>
          <p className="text-sm text-muted">
            {selected.city} · <Price amount={selected.price} currency={selected.currency} compact period={selected.pricePeriod} />
          </p>
        </div>
      ) : (
        <p className="absolute bottom-3 left-3 text-xs text-muted">Select a city cluster, then a residence.</p>
      )}
    </div>
  );
}
