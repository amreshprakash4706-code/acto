import { convertAmount, formatCompactMoney, formatMoney } from "@/lib/atconiz/format";
import { useAppStore } from "@/lib/atconiz/store";

export function Price({
  amount,
  currency,
  compact,
  period,
}: {
  amount: number;
  currency: string;
  compact?: boolean;
  period?: "sale" | "month" | "year";
}) {
  const display = useAppStore((s) => s.currency);
  const converted = convertAmount(amount, currency, display);
  const text = compact ? formatCompactMoney(converted, display) : formatMoney(converted, display);
  const suffix = period === "month" ? " / mo" : period === "year" ? " / yr" : "";
  return (
    <span className="tabular tracking-tight">
      {text}
      {suffix}
    </span>
  );
}
