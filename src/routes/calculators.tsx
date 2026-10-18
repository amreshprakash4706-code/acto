import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { affordability, calculateEmi, capRate, cashOnCash, closingCosts, ownershipCost, rentVsBuy, rentalYield } from "@/lib/atconiz/finance";
import { quoteLand, type AreaUnit, type LandSetting, type LandUse } from "@/lib/atconiz/land";
import { COUNTRIES } from "@/lib/atconiz/land-rates";
import { formatMoney } from "@/lib/atconiz/format";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveCalculation } from "@/lib/fn/market";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/calculators")({ component: Calculators });

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Calculators() {
  const { user } = useCurrentUserState();
  const [principal, setPrincipal] = useState(2_000_000);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(20);
  const [income, setIncome] = useState(25000);
  const [down, setDown] = useState(400000);
  const [price, setPrice] = useState(2_500_000);
  const [rent, setRent] = useState(8000);
  const [country, setCountry] = useState("Kenya");
  const [place, setPlace] = useState("Nakuru");
  const [setting, setSetting] = useState<LandSetting>("agricultural");
  const [landUse, setLandUse] = useState<LandUse>("agricultural");
  const [area, setArea] = useState(5);
  const [unit, setUnit] = useState<AreaUnit>("hectare");
  const [waterfront, setWaterfront] = useState(false);
  const [investDown, setInvestDown] = useState(500_000);

  const emi = useMemo(() => calculateEmi({ principal, annualRatePct: rate, tenureYears: years }), [principal, rate, years]);
  const aff = useMemo(
    () => affordability({ monthlyIncome: income, monthlyDebts: 0, downPayment: down, annualRatePct: rate, tenureYears: years }),
    [income, down, rate, years],
  );
  const yld = useMemo(() => rentalYield({ price, monthlyRent: rent }), [price, rent]);
  const rvb = useMemo(
    () => rentVsBuy({ price, monthlyRent: rent, annualRatePct: rate, tenureYears: years }),
    [price, rent, rate, years],
  );
  const land = useMemo(
    () => quoteLand({ country, place, setting, use: landUse, area, unit, waterfront }),
    [country, place, setting, landUse, area, unit, waterfront],
  );
  const closing = useMemo(() => closingCosts(price, 3), [price]);
  const cap = useMemo(() => capRate(yld.noi, price), [yld.noi, price]);
  const loanEmi = useMemo(
    () => calculateEmi({ principal: Math.max(0, price - investDown), annualRatePct: rate, tenureYears: years }),
    [price, investDown, rate, years],
  );
  const coc = useMemo(
    () =>
      cashOnCash({
        annualCashFlow: yld.noi - loanEmi.monthlyPayment * 12,
        downPayment: investDown,
        closingCosts: closing.amount,
      }),
    [yld.noi, loanEmi.monthlyPayment, investDown, closing.amount],
  );
  const own = useMemo(
    () =>
      ownershipCost({
        price,
        downPaymentPct: price > 0 ? (investDown / price) * 100 : 20,
        annualRatePct: rate,
        tenureYears: years,
        horizonYears: 5,
      }),
    [price, investDown, rate, years],
  );

  async function persist(type: string, inputs: object, results: object) {
    if (!user) return toast.message("Sign in to save calculations.");
    try {
      await saveCalculation({
        data: { type, inputs: JSON.stringify(inputs), results: JSON.stringify(results) },
      });
      toast.success("Saved to workspace.");
    } catch {
      toast.error("Could not save.");
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-12 md:px-8">
      <h1 className="font-display text-5xl">Calculators</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Deterministic illustrations with visible assumptions. Not tax, legal, or lending advice.
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-display text-2xl">Mortgage / EMI</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Principal" value={principal} onChange={setPrincipal} />
            <Field label="Rate %" value={rate} onChange={setRate} />
            <Field label="Years" value={years} onChange={setYears} />
          </div>
          <p className="mt-4 font-display text-4xl tabular">{formatMoney(emi.monthlyPayment, "USD")}<span className="text-lg text-muted"> / mo</span></p>
          <p className="text-sm text-muted">Interest {formatMoney(emi.totalInterest, "USD")} over {emi.months} months.</p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={() => persist("emi", { principal, rate, years }, emi)}>
            Save
          </Button>
        </section>
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-display text-2xl">Affordability</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Monthly income" value={income} onChange={setIncome} />
            <Field label="Down payment" value={down} onChange={setDown} />
          </div>
          <p className="mt-4 font-display text-4xl tabular">{formatMoney(aff.maxPrice, "USD")}</p>
          <p className="text-sm text-muted">36% DTI cap. Monthly budget {formatMoney(aff.monthlyBudget, "USD")}.</p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={() => persist("affordability", { income, down, rate, years }, aff)}>
            Save
          </Button>
        </section>
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-display text-2xl">Rental yield</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Price" value={price} onChange={setPrice} />
            <Field label="Monthly rent" value={rent} onChange={setRent} />
          </div>
          <p className="mt-4 font-display text-4xl tabular">{yld.grossYieldPct.toFixed(2)}%</p>
          <p className="text-sm text-muted">Net {yld.netYieldPct.toFixed(2)}% after a 25% expense heuristic.</p>
        </section>
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-display text-2xl">Rent versus buy</h2>
          <p className="mt-4 text-sm text-muted">
            7-year horizon. Advantage: <strong className="text-fg">{rvb.advantage}</strong>. Buy outflow{" "}
            {formatMoney(rvb.buyTotal, "USD")}, rent outflow {formatMoney(rvb.rentTotal, "USD")}.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {rvb.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-border p-6 lg:col-span-2">
          <h2 className="font-display text-2xl">Ownership and returns</h2>
          <p className="mt-1 text-sm text-muted">
            Uses the price and rent above, plus the down payment here. Cap rate is NOI over price. Cash-on-cash subtracts the illustrated loan payment from NOI.
          </p>
          <div className="mt-4 max-w-xs">
            <Field label="Cash invested (down payment)" value={investDown} onChange={setInvestDown} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Cap rate</p>
              <p className="font-display text-3xl tabular">{cap.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Cash-on-cash</p>
              <p className="font-display text-3xl tabular">{coc.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">5-year cash outlay</p>
              <p className="font-display text-3xl tabular">{formatMoney(own.horizonCash, "USD")}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            Closing costs modelled at 3% ({formatMoney(closing.amount, "USD")}). {own.notes[0]}
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            size="sm"
            onClick={() => persist("ownership", { price, rent, investDown, rate, years }, { cap, coc, horizonCash: own.horizonCash })}
          >
            Save
          </Button>
        </section>
        <section className="rounded-xl border border-border p-6 lg:col-span-2">
          <h2 className="font-display text-2xl">Land value, worldwide</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Any country and any place. A named city uses that market’s prime anchor. Everywhere else uses the country’s suburban band, then the setting — city center, town, farm, or remote. Reference rates only, not an appraisal.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Manhattan plot", country: "United States", place: "Manhattan", setting: "prime" as const, use: "residential" as const, area: 2500, unit: "sqft" as const, waterfront: false },
              { label: "Cotswolds edge", country: "United Kingdom", place: "Cotswolds", setting: "town" as const, use: "residential" as const, area: 0.5, unit: "acre" as const, waterfront: false },
              { label: "Kenya farmland", country: "Kenya", place: "Nakuru", setting: "agricultural" as const, use: "agricultural" as const, area: 5, unit: "hectare" as const, waterfront: false },
              { label: "Goa waterfront", country: "India", place: "Goa", setting: "suburban" as const, use: "residential" as const, area: 500, unit: "sqm" as const, waterfront: true },
            ].map((ex) => (
              <button
                key={ex.label}
                type="button"
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:text-fg"
                onClick={() => {
                  setCountry(ex.country);
                  setPlace(ex.place);
                  setSetting(ex.setting);
                  setLandUse(ex.use);
                  setArea(ex.area);
                  setUnit(ex.unit);
                  setWaterfront(ex.waterfront);
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label htmlFor="land-country">Country</Label>
              <Input
                id="land-country"
                list="land-countries"
                value={country}
                placeholder="Any country"
                onChange={(e) => setCountry(e.target.value)}
              />
              <datalist id="land-countries">
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="land-place">Place</Label>
              <Input
                id="land-place"
                value={place}
                placeholder="City, village, district, or address"
                onChange={(e) => setPlace(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="land-setting">Setting</Label>
              <Select id="land-setting" value={setting} onChange={(e) => setSetting(e.target.value as LandSetting)}>
                <option value="prime">Prime center</option>
                <option value="urban">Urban</option>
                <option value="suburban">Suburban</option>
                <option value="town">Town or fringe</option>
                <option value="agricultural">Agricultural</option>
                <option value="remote">Remote</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="land-use">Land use</Label>
              <Select id="land-use" value={landUse} onChange={(e) => setLandUse(e.target.value as LandUse)}>
                <option value="residential">Residential plot</option>
                <option value="commercial">Commercial plot</option>
                <option value="agricultural">Agricultural</option>
                <option value="raw">Raw / unzoned</option>
              </Select>
            </div>
            <Field label={`Area (${unit === "sqft" ? "sq ft" : unit === "sqm" ? "m²" : unit})`} value={area} onChange={setArea} />
            <div>
              <Label htmlFor="land-unit">Unit</Label>
              <Select id="land-unit" value={unit} onChange={(e) => setUnit(e.target.value as AreaUnit)}>
                <option value="sqft">Square feet</option>
                <option value="sqm">Square metres</option>
                <option value="acre">Acres</option>
                <option value="hectare">Hectares</option>
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-accent)]"
                checked={waterfront}
                onChange={(e) => setWaterfront(e.target.checked)}
              />
              Water access
            </label>
          </div>
          {land.suggestions.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Did you mean</span>
              {land.suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="rounded-full border border-border px-3 py-1 text-sm"
                  onClick={() => setCountry(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}
          <p className="mt-4 font-display text-4xl tabular">
            {land.ready ? formatMoney(land.usd, "USD") : "—"}
          </p>
          {land.ready ? (
            <p className="mt-1 text-sm text-muted">
              {formatMoney(land.usdPerSqft, "USD")} / sq ft · {formatMoney(land.usdPerSqft * 10.7639, "USD")} / m² ·{" "}
              {formatMoney(land.usdPerSqft * 43560, "USD")} / acre
              {land.marketName ? ` · ${land.marketName}` : land.countryName ? ` · ${land.countryName}` : ""}
            </p>
          ) : null}
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {land.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
