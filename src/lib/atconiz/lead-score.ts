export type LeadSignals = {
  views: number;
  uniqueDays: number;
  favorites: number;
  inquiries: number;
  viewings: number;
  recencyHours: number | null;
  budgetFit?: number;
};

export function scoreLead(s: LeadSignals): { score: number; breakdown: Record<string, number>; reasons: string[] } {
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  breakdown.views = Math.min(25, s.views * 2);
  if (s.views >= 3) reasons.push(`${s.views} property views`);
  breakdown.repeat = Math.min(15, s.uniqueDays * 5);
  if (s.uniqueDays >= 2) reasons.push(`Active across ${s.uniqueDays} days`);
  breakdown.favorites = Math.min(20, s.favorites * 10);
  if (s.favorites) reasons.push(`${s.favorites} saved homes`);
  breakdown.inquiries = Math.min(20, s.inquiries * 12);
  if (s.inquiries) reasons.push("Direct inquiry submitted");
  breakdown.viewings = Math.min(20, s.viewings * 15);
  if (s.viewings) reasons.push("Viewing requested");
  if (s.recencyHours != null) {
    breakdown.recency = s.recencyHours < 24 ? 10 : s.recencyHours < 72 ? 6 : s.recencyHours < 168 ? 3 : 0;
  } else breakdown.recency = 0;
  breakdown.budget = Math.round(Math.max(0, Math.min(10, (s.budgetFit ?? 0) * 10)));

  const score = Math.round(
    Object.values(breakdown).reduce((a, b) => a + b, 0),
  );
  return { score: Math.min(100, score), breakdown, reasons };
}
