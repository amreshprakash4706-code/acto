import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({ component: About });

const PLANS = [
  {
    name: "Private client",
    detail: "Catalog, saved homes, viewings, calculators, Intelligence allowance.",
  },
  {
    name: "Agent",
    detail: "Switch your workspace to Agent to open the CRM, listings, and viewing desk.",
  },
  {
    name: "Atelier",
    detail: "Operations console for catalog, reviews, roles, and usage — first account bootstraps Admin.",
  },
];

export function About() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
      <p className="text-[11px] uppercase tracking-[0.18em] text-accent">The house</p>
      <h1 className="mt-2 font-display text-5xl">Atelier</h1>
      <p className="mt-4 text-lg text-muted">
        Atconiz is a real-estate intelligence operating layer: discovery, valuation, market context, client
        engagement, and agent operations on one catalog.
      </p>
      <div className="mt-10 space-y-4">
        {PLANS.map((p) => (
          <div key={p.name} className="rounded-xl border border-border p-6">
            <h2 className="font-display text-2xl">{p.name}</h2>
            <p className="mt-2 text-sm text-muted">{p.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">
        Payments are not processed in this build. Entitlements follow your workspace role. External email, object
        storage, and card billing require provider credentials and are not simulated.
      </p>
      <Button asChild className="mt-8">
        <Link to="/login">Request access</Link>
      </Button>
    </div>
  );
}
