import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { listProperties } from "@/lib/fn/properties";
import type { PropertyCard } from "@/lib/atconiz/types";
import { Input } from "@/components/ui/input";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PropertyCard[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      listProperties({ data: { q, natural: true, limit: 8 } })
        .then((r) => setItems(r.items))
        .catch(() => setItems([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const actions = useMemo(
    () => [
      { label: "Explore catalog", run: () => navigate({ to: "/explore", search: { q } }) },
      { label: "Ask Intelligence", run: () => navigate({ to: "/studio", search: { q } }) },
      { label: "Open workspace", run: () => navigate({ to: "/workspace", search: {} }) },
      { label: "Deal desk", run: () => navigate({ to: "/workspace", search: { tab: "deals" } }) },
      { label: "Calculators", run: () => navigate({ to: "/calculators" }) },
    ],
    [navigate, q],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-bg/70 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Command"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-[var(--shadow-soft)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <Input
            autoFocus
            placeholder="Find a residence, city, or command…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-80 overflow-auto border-t border-border p-2">
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-bg-subtle"
                onClick={() => {
                  a.run();
                  onClose();
                }}
              >
                {a.label}
              </button>
            </li>
          ))}
          {items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-bg-subtle"
                onClick={() => {
                  navigate({ to: "/properties/$id", params: { id: p.id } });
                  onClose();
                }}
              >
                <span className="block">{p.title}</span>
                <span className="text-xs text-muted">
                  {p.city} · {p.propertyType}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
