"use client";

import { useState } from "react";
import { CATEGORY_STYLES, type Category } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface CategoryBreakdownProps {
  data: { category: Category; total: number; count: number }[];
}

/** Horizontal bar list sorted by spend; each bar keeps its category's fixed color. */
export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const [hovered, setHovered] = useState<Category | null>(null);
  const grand = data.reduce((acc, d) => acc + d.total, 0);
  const rows = [...data].sort((a, b) => b.total - a.total);
  const max = rows[0]?.total ?? 0;

  if (grand === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No spending in this period.</p>;
  }

  return (
    <div>
      {/* Stacked share bar */}
      <div className="mb-5 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
        {rows
          .filter((r) => r.total > 0)
          .map((r) => (
            <div
              key={r.category}
              style={{ width: `${(r.total / grand) * 100}%`, backgroundColor: CATEGORY_STYLES[r.category].color }}
              className={`transition-opacity ${hovered && hovered !== r.category ? "opacity-40" : ""}`}
            />
          ))}
      </div>

      <ul className="space-y-3">
        {rows.map((r) => {
          const share = grand > 0 ? r.total / grand : 0;
          return (
            <li
              key={r.category}
              onMouseEnter={() => setHovered(r.category)}
              onMouseLeave={() => setHovered(null)}
              className="group"
              title={`${r.category}: ${formatCurrency(r.total)} across ${r.count} expense${r.count === 1 ? "" : "s"}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_STYLES[r.category].color }} aria-hidden />
                  {r.category}
                  <span className="text-xs text-slate-400">
                    {r.count} item{r.count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="tabular-nums text-slate-900">
                  {formatCurrency(r.total)}
                  <span className="ml-2 inline-block w-10 text-right text-xs text-slate-500">{(share * 100).toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-r-full transition-all duration-500"
                  style={{
                    width: `${max > 0 ? (r.total / max) * 100 : 0}%`,
                    backgroundColor: CATEGORY_STYLES[r.category].color,
                    opacity: hovered && hovered !== r.category ? 0.4 : 1,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
