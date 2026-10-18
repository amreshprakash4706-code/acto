import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { listProperties } from "@/lib/fn/properties";
import { myComparisons, saveComparison } from "@/lib/fn/engagement";
import type { PropertyCard } from "@/lib/atconiz/types";
import { Price } from "@/components/property/price";
import { provenanceLabel, formatMoney } from "@/lib/atconiz/format";
import { calculateEmi } from "@/lib/atconiz/finance";
import { useAppStore } from "@/lib/atconiz/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({ ids: z.string().optional() });

export const Route = createFileRoute("/compare")({
  validateSearch: schema,
  component: Compare,
});

function Compare() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/compare" });
  const storeIds = useAppStore((s) => s.compareIds);
  const { user } = useCurrentUserState();
  const ids = (search.ids ? search.ids.split(",") : storeIds).filter(Boolean).slice(0, 4);
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [saved, setSaved] = useState<Awaited<ReturnType<typeof myComparisons>>>([]);

  useEffect(() => {
    listProperties({ data: { limit: 48 } }).then((r) => {
      setItems(r.items.filter((p) => ids.includes(p.id)));
    });
  }, [ids.join(",")]);

  useEffect(() => {
    if (!user) return;
    myComparisons().then(setSaved).catch(() => setSaved([]));
  }, [user]);

  if (items.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20">
        <h1 className="font-display text-4xl">Compare</h1>
        <p className="mt-3 text-muted">Select at least two residences from Explore to compare them side by side.</p>
        {saved.length ? (
          <ul className="mt-6 space-y-2">
            {saved.map((set) => (
              <li key={set.id}>
                <button
                  type="button"
                  className="text-left text-sm text-champagne"
                  onClick={() => navigate({ search: { ids: set.propertyIds.join(",") } })}
                >
                  {set.title || set.propertyIds.join(", ")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  const rows: [string, (p: PropertyCard) => string | number][] = [
    ["Type", (p) => p.propertyType],
    ["Listing", (p) => p.listingType],
    ["City", (p) => p.city],
    ["Country", (p) => p.country],
    ["Beds", (p) => p.bedrooms ?? "—"],
    ["Baths", (p) => p.bathrooms ?? "—"],
    ["Area", (p) => (p.areaSqft ? `${p.areaSqft.toLocaleString("en")} sq ft` : "—")],
    [
      "Price / sq ft",
      (p) => (p.areaSqft ? formatMoney(p.price / p.areaSqft, p.currency) : "—"),
    ],
    [
      "Illustrative monthly",
      (p) => {
        if (p.listingType !== "SALE") return "—";
        const emi = calculateEmi({ principal: p.price * 0.8, annualRatePct: 6.5, tenureYears: 20 });
        return formatMoney(emi.monthlyPayment, p.currency);
      },
    ],
    ["Year", (p) => p.yearBuilt ?? "—"],
    ["Provenance", (p) => provenanceLabel(p.provenance)],
  ];

  return (
    <div className="mx-auto max-w-[1480px] overflow-x-auto px-5 py-10 md:px-8">
      <h1 className="font-display text-4xl">Side-by-side</h1>
      <p className="mt-2 text-sm text-muted">
        Figures are from catalog records. The monthly row assumes 80% loan, 6.5% interest, 20 years — an illustration, not a quote.
      </p>
      {user ? (
        <Button
          className="mt-4"
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              await saveComparison({
                data: { propertyIds: items.map((p) => p.id), title: items.map((p) => p.title).join(" · ") },
              });
              setSaved(await myComparisons());
              toast.success("Comparison saved to your account.");
            } catch {
              toast.error("Could not save this comparison.");
            }
          }}
        >
          Save this set
        </Button>
      ) : null}
      <table className="mt-8 w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-3 text-left text-muted"> </th>
            {items.map((p) => (
              <th key={p.id} className="p-3 text-left">
                {p.primaryImage ? <img src={p.primaryImage} alt="" className="mb-3 h-28 w-full rounded-md object-cover" /> : null}
                <span className="font-display text-xl">{p.title}</span>
                <div className="mt-1 text-champagne">
                  <Price amount={p.price} currency={p.currency} compact period={p.pricePeriod} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, fn]) => (
            <tr key={label} className="border-t border-border">
              <th className="p-3 text-left font-medium text-muted">{label}</th>
              {items.map((p) => (
                <td key={p.id} className="p-3">
                  {fn(p)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-border">
            <th className="p-3 text-left font-medium text-muted">Amenities</th>
            {items.map((p) => (
              <td key={p.id} className="p-3 text-muted">
                {p.amenities.join(", ")}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
