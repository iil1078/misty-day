import { CATEGORY_STYLES, type Category } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface SummaryCardsProps {
  total: number;
  totalCount: number;
  thisMonth: number;
  lastMonth: number;
  avgPerDay: number;
  topCategory: { category: Category; total: number; share: number } | null;
}

export function SummaryCards({ total, totalCount, thisMonth, lastMonth, avgPerDay, topCategory }: SummaryCardsProps) {
  const change = lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total spending" value={formatCurrency(total)} detail={`${totalCount} expense${totalCount === 1 ? "" : "s"} recorded`} />
      <StatCard
        label="This month"
        value={formatCurrency(thisMonth)}
        detail={
          change === null ? (
            "No data for last month"
          ) : (
            <span className="inline-flex items-center gap-1">
              <span
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                  change > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <span aria-hidden>{change > 0 ? "▲" : "▼"}</span>
                <span className="ml-0.5">{Math.abs(change * 100).toFixed(0)}%</span>
                <span className="sr-only">{change > 0 ? "increase" : "decrease"}</span>
              </span>
              vs {formatCurrency(lastMonth)} last month
            </span>
          )
        }
      />
      <StatCard label="Daily average" value={formatCurrency(avgPerDay)} detail="This month, per day so far" />
      <StatCard
        label="Top category"
        value={
          topCategory ? (
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-xl">{CATEGORY_STYLES[topCategory.category].icon}</span>
              {topCategory.category}
            </span>
          ) : (
            "—"
          )
        }
        detail={
          topCategory
            ? `${formatCurrency(topCategory.total)} · ${(topCategory.share * 100).toFixed(0)}% this month`
            : "No spending this month"
        }
      />
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <div className="mt-2 text-sm text-slate-500">{detail}</div>
    </div>
  );
}
