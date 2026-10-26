import { CATEGORIES, type Category, type Expense } from "../types";
import { escapeCell, expensesToCSV } from "../csv";
import { sum } from "../analytics";
import { formatCurrency, formatDate, formatMonthKey, toISODate } from "../format";
import { inPeriod, resolvePeriod, type ResolvedPeriod } from "./periods";
import type { ExportArtifact, PeriodId, TemplateId } from "./types";

export interface ExportTemplate {
  id: TemplateId;
  name: string;
  audience: string;
  description: string;
  format: "CSV" | "JSON" | "Markdown";
  extension: string;
  mimeType: string;
  icon: string;
  /** Tailwind classes for the card's tinted icon tile. */
  tint: string;
  periods: PeriodId[];
  defaultPeriod: PeriodId;
  build: (expenses: Expense[], period: ResolvedPeriod, now: Date) => ExportArtifact;
}

const csvRow = (cells: (string | number)[]) => cells.map((c) => escapeCell(String(c))).join(",");
const money = (n: number) => n.toFixed(2);
const pct = (part: number, whole: number) => (whole > 0 ? ((part / whole) * 100).toFixed(1) : "0.0");
const sortedAsc = (rows: Expense[]) => [...rows].sort((a, b) => a.date.localeCompare(b.date));

function byCategory(rows: Expense[]): Map<Category, Expense[]> {
  const map = new Map<Category, Expense[]>();
  for (const e of rows) map.set(e.category, [...(map.get(e.category) ?? []), e]);
  return map;
}

function monthsEnding(endISO: string, count: number): string[] {
  const [y, m] = endISO.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => toISODate(new Date(y, m - 1 - (count - 1 - i), 1)).slice(0, 7));
}

const ledger: ExportTemplate = {
  id: "ledger",
  name: "Expense Ledger",
  audience: "For spreadsheets",
  description: "Every transaction as a clean table. Ideal for Google Sheets, Excel, or live sync.",
  format: "CSV",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8",
  icon: "📒",
  tint: "bg-sky-50 ring-sky-200",
  periods: ["this-month", "last-month", "last-3-months", "this-year", "all"],
  defaultPeriod: "all",
  build: (expenses, period) => {
    const rows = inPeriod(expenses, period);
    return {
      filename: `spendwise-ledger_${period.slug}.csv`,
      mimeType: ledger.mimeType,
      content: expensesToCSV(rows),
      rowCount: rows.length,
    };
  },
};

const taxReport: ExportTemplate = {
  id: "tax-report",
  name: "Tax Report",
  audience: "For your accountant",
  description: "A yearly ledger grouped by category with subtotals and a grand total.",
  format: "CSV",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8",
  icon: "🧾",
  tint: "bg-amber-50 ring-amber-200",
  periods: ["this-year", "last-year"],
  defaultPeriod: "last-year",
  build: (expenses, period, now) => {
    const rows = inPeriod(expenses, period);
    const groups = byCategory(rows);
    const lines = [
      csvRow(["Spendwise Tax Report", period.label]),
      csvRow(["Period", `${period.from} to ${period.to}`]),
      csvRow(["Generated", now.toISOString()]),
      "",
      csvRow(["Category", "Date", "Description", "Amount"]),
    ];
    for (const c of CATEGORIES) {
      const items = groups.get(c);
      if (!items) continue;
      for (const e of sortedAsc(items)) lines.push(csvRow([c, e.date, e.description, money(e.amount)]));
      lines.push(csvRow([`${c} subtotal`, "", `${items.length} transactions`, money(sum(items))]), "");
    }
    lines.push(csvRow(["Grand total", "", `${rows.length} transactions`, money(sum(rows))]));
    return {
      filename: `spendwise-tax-report_${period.slug}.csv`,
      mimeType: taxReport.mimeType,
      content: lines.join("\r\n"),
      rowCount: rows.length,
    };
  },
};

const monthlySummary: ExportTemplate = {
  id: "monthly-summary",
  name: "Monthly Summary",
  audience: "For email, Slack & Notion",
  description: "A readable digest: totals, month-over-month change, category split and top expenses.",
  format: "Markdown",
  extension: "md",
  mimeType: "text/markdown;charset=utf-8",
  icon: "📅",
  tint: "bg-violet-50 ring-violet-200",
  periods: ["this-month", "last-month"],
  defaultPeriod: "last-month",
  build: (expenses, period, now) => {
    const rows = inPeriod(expenses, period);
    const [y, m] = period.from!.split("-").map(Number);
    const prev = inPeriod(expenses, {
      ...period,
      from: toISODate(new Date(y, m - 2, 1)),
      to: toISODate(new Date(y, m - 1, 0)),
    });
    const total = sum(rows);
    const prevTotal = sum(prev);
    const days = Math.min(new Date(y, m, 0).getDate(), period.to! > toISODate(now) ? now.getDate() : 31);
    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
    const prevName = new Date(y, m - 2, 1).toLocaleDateString("en-US", { month: "long" });
    const groups = byCategory(rows);
    const prevGroups = byCategory(prev);

    const md = [
      `# Monthly Summary — ${period.label}`,
      "",
      `**Total spent:** ${formatCurrency(total)} across ${rows.length} expense${rows.length === 1 ? "" : "s"}  `,
      `**Daily average:** ${formatCurrency(total / Math.max(1, days))}` +
        (change === null ? "" : ` · **vs ${prevName}:** ${change >= 0 ? "+" : ""}${change.toFixed(1)}%`),
      "",
      "## By category",
      "",
      "| Category | Spent | Share | vs last month |",
      "|---|---:|---:|---:|",
      ...CATEGORIES.filter((c) => groups.has(c))
        .map((c) => ({ c, t: sum(groups.get(c)!), p: sum(prevGroups.get(c) ?? []) }))
        .sort((a, b) => b.t - a.t)
        .map(
          ({ c, t, p }) =>
            `| ${c} | ${formatCurrency(t)} | ${pct(t, total)}% | ${p > 0 ? `${t >= p ? "+" : ""}${(((t - p) / p) * 100).toFixed(0)}%` : "new"} |`,
        ),
      "",
      "## Largest expenses",
      "",
      ...[...rows]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map((e, i) => `${i + 1}. **${e.description}** — ${formatCurrency(e.amount)} (${e.category}, ${formatDate(e.date)})`),
      "",
      `_Generated by Spendwise on ${formatDate(toISODate(now))}._`,
    ];
    return {
      filename: `spendwise-monthly-summary_${period.slug}.md`,
      mimeType: monthlySummary.mimeType,
      content: md.join("\n"),
      rowCount: rows.length,
    };
  },
};

const categoryAnalysis: ExportTemplate = {
  id: "category-analysis",
  name: "Category Analysis",
  audience: "For budgeting",
  description: "Per-category totals, share, averages, largest item and a 6-month trend.",
  format: "CSV",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8",
  icon: "📊",
  tint: "bg-emerald-50 ring-emerald-200",
  periods: ["last-3-months", "this-year", "last-year", "all"],
  defaultPeriod: "this-year",
  build: (expenses, period, now) => {
    const rows = inPeriod(expenses, period);
    const total = sum(rows);
    const groups = byCategory(rows);
    const end = period.to && period.to < toISODate(now) ? period.to : toISODate(now);
    const months = monthsEnding(end, 6);
    const lines = [
      csvRow([
        "Category",
        "Transactions",
        "Total",
        "Share %",
        "Average",
        "Largest",
        ...months.map((k) => formatMonthKey(k, true)),
        "Trend (last vs prior month) %",
      ]),
    ];
    for (const c of CATEGORIES) {
      const items = groups.get(c) ?? [];
      const monthly = months.map((k) => sum(items.filter((e) => e.date.startsWith(k))));
      const [prior, last] = monthly.slice(-2);
      lines.push(
        csvRow([
          c,
          items.length,
          money(sum(items)),
          pct(sum(items), total),
          money(items.length ? sum(items) / items.length : 0),
          money(Math.max(0, ...items.map((e) => e.amount))),
          ...monthly.map(money),
          prior > 0 ? (((last - prior) / prior) * 100).toFixed(1) : "",
        ]),
      );
    }
    lines.push(csvRow(["All categories", rows.length, money(total), "100.0", money(rows.length ? total / rows.length : 0), "", ...months.map((k) => money(sum(rows.filter((e) => e.date.startsWith(k))))), ""]));
    return {
      filename: `spendwise-category-analysis_${period.slug}.csv`,
      mimeType: categoryAnalysis.mimeType,
      content: lines.join("\r\n"),
      rowCount: rows.length,
    };
  },
};

const fullBackup: ExportTemplate = {
  id: "full-backup",
  name: "Full Backup",
  audience: "For safekeeping",
  description: "Complete, lossless JSON snapshot of every expense including IDs and timestamps.",
  format: "JSON",
  extension: "json",
  mimeType: "application/json",
  icon: "🛟",
  tint: "bg-slate-100 ring-slate-200",
  periods: ["all"],
  defaultPeriod: "all",
  build: (expenses, period, now) => ({
    filename: `spendwise-backup_${toISODate(now)}.json`,
    mimeType: fullBackup.mimeType,
    content: JSON.stringify({ format: "spendwise-backup", version: 1, exportedAt: now.toISOString(), count: expenses.length, expenses }, null, 2),
    rowCount: inPeriod(expenses, period).length,
  }),
};

export const TEMPLATES: Record<TemplateId, ExportTemplate> = {
  ledger,
  "tax-report": taxReport,
  "monthly-summary": monthlySummary,
  "category-analysis": categoryAnalysis,
  "full-backup": fullBackup,
};

export const TEMPLATE_ORDER: TemplateId[] = ["monthly-summary", "tax-report", "category-analysis", "ledger", "full-backup"];

export function buildArtifact(templateId: TemplateId, periodId: PeriodId, expenses: Expense[], now = new Date()): ExportArtifact {
  const template = TEMPLATES[templateId];
  const period = template.periods.includes(periodId) ? periodId : template.defaultPeriod;
  return template.build(expenses, resolvePeriod(period, now), now);
}
