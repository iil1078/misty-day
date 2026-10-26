import { CATEGORIES, type Category, type Expense } from "../types";
import { sum } from "../analytics";
import { formatDate, toISODate } from "../format";
import type { ExportOptions, ExportSort, ExportSummary } from "./types";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "csv",
  from: "",
  to: "",
  categories: [...CATEGORIES],
  keyword: "",
  sort: "date-desc",
  filename: "",
};

export const SORT_LABELS: Record<ExportSort, string> = {
  "date-desc": "Newest first",
  "date-asc": "Oldest first",
  "amount-desc": "Highest amount",
  "amount-asc": "Lowest amount",
};

export interface DatePreset {
  id: string;
  label: string;
  range: (now: Date) => { from: string; to: string };
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "all", label: "All time", range: () => ({ from: "", to: "" }) },
  {
    id: "this-month",
    label: "This month",
    range: (n) => ({ from: toISODate(new Date(n.getFullYear(), n.getMonth(), 1)), to: toISODate(n) }),
  },
  {
    id: "last-month",
    label: "Last month",
    range: (n) => ({
      from: toISODate(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
      to: toISODate(new Date(n.getFullYear(), n.getMonth(), 0)),
    }),
  },
  {
    id: "last-90",
    label: "Last 90 days",
    range: (n) => ({ from: toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 89)), to: toISODate(n) }),
  },
  {
    id: "ytd",
    label: "Year to date",
    range: (n) => ({ from: toISODate(new Date(n.getFullYear(), 0, 1)), to: toISODate(n) }),
  },
];

/** Which preset (if any) matches the current range, so the UI can highlight it. */
export function matchPreset(from: string, to: string, now = new Date()): string | null {
  return DATE_PRESETS.find((p) => {
    const r = p.range(now);
    return r.from === from && r.to === to;
  })?.id ?? null;
}

export function isRangeInvalid(options: Pick<ExportOptions, "from" | "to">): boolean {
  return Boolean(options.from && options.to && options.from > options.to);
}

/** Rows matching the date range and keyword, before category filtering (used for per-category counts). */
export function filterByRangeAndKeyword(expenses: Expense[], options: ExportOptions): Expense[] {
  const q = options.keyword.trim().toLowerCase();
  return expenses.filter(
    (e) =>
      (!options.from || e.date >= options.from) &&
      (!options.to || e.date <= options.to) &&
      (!q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)),
  );
}

export function selectExportRows(expenses: Expense[], options: ExportOptions): Expense[] {
  if (isRangeInvalid(options)) return [];
  const allowed = new Set<Category>(options.categories);
  const rows = filterByRangeAndKeyword(expenses, options).filter((e) => allowed.has(e.category));
  return sortRows(rows, options.sort);
}

export function sortRows(rows: Expense[], sort: ExportSort): Expense[] {
  const [key, dir] = sort.split("-") as ["date" | "amount", "asc" | "desc"];
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = key === "date" ? a.date.localeCompare(b.date) : a.amount - b.amount;
    // Stable, deterministic tie-breaks so repeated exports are byte-identical.
    return sign * primary || b.date.localeCompare(a.date) || a.createdAt.localeCompare(b.createdAt);
  });
}

export function summarize(rows: Expense[]): ExportSummary {
  const total = sum(rows);
  let earliest: string | null = null;
  let latest: string | null = null;
  const cents = new Map<Category, { count: number; total: number }>();
  for (const e of rows) {
    if (!earliest || e.date < earliest) earliest = e.date;
    if (!latest || e.date > latest) latest = e.date;
    const entry = cents.get(e.category) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Math.round(e.amount * 100);
    cents.set(e.category, entry);
  }
  return {
    count: rows.length,
    total,
    average: rows.length ? Math.round((total / rows.length) * 100) / 100 : 0,
    earliest,
    latest,
    byCategory: CATEGORIES.filter((c) => cents.has(c))
      .map((category) => ({ category, count: cents.get(category)!.count, total: cents.get(category)!.total / 100 }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Human description of the active filters, used in report headers and metadata. */
export function describeFilters(options: ExportOptions): { range: string; categories: string } {
  const range =
    options.from && options.to
      ? `${formatDate(options.from)} – ${formatDate(options.to)}`
      : options.from
        ? `From ${formatDate(options.from)}`
        : options.to
          ? `Through ${formatDate(options.to)}`
          : "All dates";
  const categories =
    options.categories.length === CATEGORIES.length ? "All categories" : options.categories.join(", ") || "None";
  return { range, categories };
}

export function defaultFilename(options: Pick<ExportOptions, "from" | "to">, now = new Date()): string {
  if (options.from && options.to) return `spendwise-expenses_${options.from}_to_${options.to}`;
  if (options.from) return `spendwise-expenses_since_${options.from}`;
  if (options.to) return `spendwise-expenses_through_${options.to}`;
  return `spendwise-expenses_${toISODate(now)}`;
}

/** Strip characters that are illegal in filenames on common OSes, and any extension the user typed. */
export function sanitizeFilename(name: string, extension: string): string {
  return name
    .replace(new RegExp(`\\.${extension}$`, "i"), "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 120);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
