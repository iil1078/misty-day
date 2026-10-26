import type { Expense } from "../types";
import { toISODate } from "../format";
import type { PeriodId } from "./types";

export interface ResolvedPeriod {
  id: PeriodId;
  label: string;
  /** Inclusive YYYY-MM-DD bounds; null = unbounded. */
  from: string | null;
  to: string | null;
  /** Short token for filenames, e.g. "2026-10" or "2026". */
  slug: string;
}

export const PERIOD_LABELS: Record<PeriodId, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-3-months": "Last 3 months",
  "this-year": "This year",
  "last-year": "Last year",
  all: "All time",
};

const monthName = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

export function resolvePeriod(id: PeriodId, now = new Date()): ResolvedPeriod {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (id) {
    case "this-month": {
      const start = new Date(y, m, 1);
      return { id, label: monthName(start), from: toISODate(start), to: toISODate(new Date(y, m + 1, 0)), slug: toISODate(start).slice(0, 7) };
    }
    case "last-month": {
      const start = new Date(y, m - 1, 1);
      return { id, label: monthName(start), from: toISODate(start), to: toISODate(new Date(y, m, 0)), slug: toISODate(start).slice(0, 7) };
    }
    case "last-3-months": {
      const start = new Date(y, m - 2, 1);
      return {
        id,
        label: `${start.toLocaleDateString("en-US", { month: "short" })} – ${now.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
        from: toISODate(start),
        to: toISODate(new Date(y, m + 1, 0)),
        slug: `${toISODate(start).slice(0, 7)}_to_${toISODate(now).slice(0, 7)}`,
      };
    }
    case "this-year":
      return { id, label: String(y), from: `${y}-01-01`, to: `${y}-12-31`, slug: String(y) };
    case "last-year":
      return { id, label: String(y - 1), from: `${y - 1}-01-01`, to: `${y - 1}-12-31`, slug: String(y - 1) };
    case "all":
      return { id, label: "All time", from: null, to: null, slug: "all-time" };
  }
}

export function inPeriod(expenses: Expense[], period: ResolvedPeriod): Expense[] {
  return expenses.filter((e) => (!period.from || e.date >= period.from) && (!period.to || e.date <= period.to));
}
