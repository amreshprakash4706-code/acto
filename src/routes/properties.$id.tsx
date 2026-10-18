import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProperty, valueForProperty } from "@/lib/fn/properties";
import { addReview, listFavorites, listReviews, requestViewing, submitContact, submitOffer, toggleFavorite } from "@/lib/fn/engagement";
import type { PropertyCard, ValuationResult } from "@/lib/atconiz/types";
import { PropertyTile } from "@/components/property/card";
import { Price } from "@/components/property/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { provenanceLabel } from "@/lib/atconiz/format";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAppStore } from "@/lib/atconiz/store";
import { toast } from "sonner";
import { calculateEmi, rentalYield } from "@/lib/atconiz/finance";
import { ConstellationMap } from "@/components/property/constellation-map";

export const Route = createFileRoute("/properties/$id")({
  component: PropertyPage,
  head: ({ params }) => ({
    meta: [{ title: `${params.id} · Atconiz` }],
  }),
});

function PropertyPage() {
  const { id } = Route.useParams();
  const { user } = useCurrentUserState();
  const toggleCompare = useAppStore((s) => s.toggleCompare);
  const [property, setProperty] = useState<PropertyCard | null>(null);
  const [similar, setSimilar] = useState<PropertyCard[]>([]);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [hero, setHero] = useState(0);
  const [reviews, setReviews] = useState<{ id: string; rating: number; title: string | null; body: string | null }[]>([]);
  const [fav, setFav] = useState(false);
  const [when, setWhen] = useState("");
  const [vtype, setVtype] = useState<"IN_PERSON" | "VIRTUAL">("IN_PERSON");
  const [message, setMessage] = useState("");
  const [offer, setOffer] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");

  useEffect(() => {
    getProperty({ data: { id } }).then((r) => {
      setProperty(r.property);
      setSimilar(r.similar);
      setHero(0);
    });
    valueForProperty({ data: { id } }).then(setValuation).catch(() => setValuation(null));
    listReviews({ data: { propertyId: id } }).then(setReviews).catch(() => setReviews([]));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    listFavorites()
      .then((ids) => setFav(ids.includes(id)))
      .catch(() => setFav(false));
  }, [user, id]);

  if (!property) {
    return <div className="mx-auto max-w-3xl px-5 py-24 text-muted">Loading residence…</div>;
  }

  const emi = calculateEmi({ principal: property.price * 0.8, annualRatePct: 6.5, tenureYears: 20 });
  const yieldEst =
    property.listingType === "RENT"
      ? rentalYield({
          price: property.price * (property.pricePeriod === "month" ? 200 : 12),
          monthlyRent: property.pricePeriod === "month" ? property.price : property.price / 12,
        })
      : null;

  return (
    <div className="mx-auto max-w-[1480px] px-5 py-8 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-bg-subtle">
            {property.images[hero] ? (
              <img
                src={property.images[hero].url}
                alt={property.images[hero].altText ?? property.title}
                className="aspect-[16/10] w-full object-cover"
              />
            ) : null}
            <div className="flex gap-2 overflow-x-auto p-3">
              {property.images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setHero(i)}
                  className="h-16 w-24 shrink-0 overflow-hidden rounded-md border border-border"
                >
                  <img src={img.url} alt={img.altText ?? ""} className="size-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap gap-2">
              <Badge>{property.propertyType}</Badge>
              <Badge>{property.listingType === "RENT" ? "Lease" : "Sale"}</Badge>
              <Badge>{provenanceLabel(property.provenance)}</Badge>
            </div>
            <h1 className="mt-4 font-display text-4xl md:text-5xl">{property.title}</h1>
            <p className="mt-2 text-muted">
              {property.neighborhood ? `${property.neighborhood}, ` : ""}
              {property.city}, {property.country}
            </p>
            <p className="mt-6 max-w-3xl text-base leading-relaxed">{property.description}</p>
            <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["Bedrooms", property.bedrooms ?? "—"],
                ["Baths", property.bathrooms ?? "—"],
                ["Area", property.areaSqft ? `${property.areaSqft.toLocaleString("en")} sq ft` : "—"],
                ["Year", property.yearBuilt ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border p-4">
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted">{k}</dt>
                  <dd className="mt-1 font-display text-2xl tabular">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8">
              <h2 className="font-display text-2xl">Amenities</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <li key={a} className="rounded-full border border-border px-3 py-1 text-sm">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-bg-elevated p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Asking</p>
            <p className="mt-1 font-display text-4xl text-champagne">
              <Price amount={property.price} currency={property.currency} period={property.pricePeriod} />
            </p>
            {property.listingType === "SALE" ? (
              <p className="mt-2 text-sm text-muted">
                Illustrative 20% down, 6.5%, 20 years:{" "}
                <Price amount={emi.monthlyPayment} currency={property.currency} period="month" />
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              <Button
                type="button"
                onClick={async () => {
                  if (!user) return toast.message("Sign in to save.");
                  const r = await toggleFavorite({ data: { propertyId: property.id } });
                  setFav(r.saved);
                }}
                variant={fav ? "primary" : "secondary"}
              >
                {fav ? "Saved" : "Save"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => toggleCompare(property.id)}>
                Add to compare
              </Button>
              <Button asChild variant="secondary">
                <Link to="/studio" search={{ q: `Analyze ${property.title}`, propertyId: property.id }}>
                  Ask Intelligence
                </Link>
              </Button>
            </div>
          </div>

          <form
            className="rounded-xl border border-border bg-bg-elevated p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user) return toast.message("Sign in to request a viewing.");
              if (!when) return toast.error("Choose a time.");
              try {
                await requestViewing({
                  data: { propertyId: property.id, requestedAt: new Date(when).toISOString(), viewingType: vtype },
                });
                toast.success("Viewing requested. Status is tracked in your workspace.");
              } catch {
                toast.error("Could not request viewing.");
              }
            }}
          >
            <h2 className="font-display text-2xl">Request a viewing</h2>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="when">Proposed time</Label>
                <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="vtype">Type</Label>
                <Select id="vtype" value={vtype} onChange={(e) => setVtype(e.target.value as typeof vtype)}>
                  <option value="IN_PERSON">In person</option>
                  <option value="VIRTUAL">Virtual</option>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Submit request
              </Button>
            </div>
          </form>

          <form
            className="rounded-xl border border-border bg-bg-elevated p-6"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user) return toast.message("Sign in to inquire.");
              try {
                await submitContact({
                  data: {
                    name: user.displayName || "Client",
                    email: user.primaryEmail || "client@atconiz.local",
                    message,
                    propertyId: property.id,
                    subject: `Inquiry: ${property.title}`,
                  },
                });
                setMessage("");
                toast.success("Inquiry logged. An advisor follow-up is queued in-app.");
              } catch {
                toast.error("Could not send inquiry.");
              }
            }}
          >
            <h2 className="font-display text-2xl">Contact</h2>
            <Label htmlFor="msg" className="mt-3">
              Message
            </Label>
            <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} required />
            <Button type="submit" className="mt-3 w-full" variant="secondary">
              Send inquiry
            </Button>
            <Button asChild className="mt-2 w-full" variant="ghost">
              <Link to="/workspace" search={{ tab: "deals", property: property.id }}>
                Open advisor thread
              </Link>
            </Button>
          </form>
        </aside>
      </div>

      {valuation ? (
        <section className="mt-16 rounded-xl border border-border bg-bg-elevated p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Valuation engine</p>
          <h2 className="mt-2 font-display text-3xl">Model estimate</h2>
          <p className="mt-1 text-sm text-muted">
            {valuation.method} · confidence {valuation.confidence} · {valuation.modelVersion} · as of {valuation.asOf}
          </p>
          <p className="mt-4 font-display text-4xl text-champagne">
            <Price amount={valuation.estimatedValue} currency={valuation.currency} compact />
            <span className="ml-3 text-lg text-muted">
              range <Price amount={valuation.low} currency={valuation.currency} compact /> –{" "}
              <Price amount={valuation.high} currency={valuation.currency} compact />
            </span>
          </p>
          <ul className="mt-4 space-y-1 text-sm text-muted">
            {valuation.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {valuation.comps.map((c) => (
              <Link key={c.id} to="/properties/$id" params={{ id: c.id }} className="rounded-lg border border-border p-4">
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-muted">
                  {c.city} · {c.distanceHint} · <Price amount={c.price} currency={c.currency} compact />
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-16 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-6">
          <h2 className="font-display text-2xl">Location</h2>
          <div className="mt-4">
            <ConstellationMap properties={[property, ...similar]} selectedId={property.id} onSelect={() => {}} />
          </div>
        </div>
        <div className="rounded-xl border border-border p-6">
          <h2 className="font-display text-2xl">Expression of interest</h2>
          <p className="mt-1 text-sm text-muted">Logged on-platform only. Not a legally binding offer.</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!user) return toast.message("Sign in first.");
              const amount = Number(offer);
              if (!amount) return toast.error("Enter an amount.");
              try {
                await submitOffer({ data: { propertyId: property.id, amount, currency: property.currency } });
                toast.success("Interest recorded.");
                setOffer("");
              } catch {
                toast.error("Could not record offer.");
              }
            }}
          >
            <Input placeholder="Amount" value={offer} onChange={(e) => setOffer(e.target.value)} />
            <Button type="submit">Record</Button>
          </form>
          {yieldEst ? (
            <p className="mt-4 text-sm text-muted">
              If treated as an investment against a 200× monthly heuristic price, gross yield{" "}
              {yieldEst.grossYieldPct.toFixed(2)}%. Heuristic only.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl">Reviews</h2>
        <form
          className="mt-4 max-w-xl space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user) return toast.message("Sign in to review.");
            try {
              await addReview({ data: { propertyId: property.id, rating, body: reviewBody } });
              toast.success("Review saved.");
              setReviewBody("");
              listReviews({ data: { propertyId: property.id } }).then(setReviews);
            } catch {
              toast.error("Could not save review.");
            }
          }}
        >
          <Label htmlFor="rating">Rating</Label>
          <Select id="rating" value={String(rating)} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="What stood out?" />
          <Button type="submit" variant="secondary">
            Publish review
          </Button>
        </form>
        <ul className="mt-6 space-y-3">
          {reviews.length === 0 ? <li className="text-sm text-muted">No reviews yet.</li> : null}
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium">{r.rating}/5 {r.title}</p>
              <p className="text-sm text-muted">{r.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 pb-12">
        <h2 className="font-display text-3xl">Similar in catalog</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {similar.map((p) => (
            <PropertyTile key={p.id} property={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
