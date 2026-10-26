"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useExpenses } from "@/components/ExpensesProvider";
import { useExpenseActions } from "@/components/ExpenseActionsProvider";
import { ExpenseFiltersBar } from "@/components/ExpenseFiltersBar";
import { ExpenseList, type SortDir, type SortKey } from "@/components/ExpenseList";
import { EmptyState } from "@/components/EmptyState";
import { Card, PageHeader, PageLoading, buttonSecondary } from "@/components/ui";
import { filterExpenses, sum } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { EMPTY_FILTERS, type ExpenseFilters } from "@/lib/types";

const PAGE_SIZE = 25;

export default function ExpensesPage() {
  const { expenses, isLoading } = useExpenses();
  const { openEdit, confirmDelete } = useExpenseActions();
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const list = filterExpenses(expenses, filters);
    if (sortKey === "date" && sortDir === "desc") return list; // already sorted
    return [...list].sort((a, b) => {
      const diff = sortKey === "date" ? a.date.localeCompare(b.date) : a.amount - b.amount;
      return sortDir === "asc" ? diff : -diff;
    });
  }, [expenses, filters, sortKey, sortDir]);

  useEffect(() => setVisible(PAGE_SIZE), [filters, sortKey, sortDir]);

  const total = useMemo(() => sum(filtered), [filtered]);

  if (isLoading) return <PageLoading />;

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Search, filter, edit and export your expenses."
        actions={
          expenses.length > 0 && (
            <Link href="/exports" className={buttonSecondary}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Share & export
            </Link>
          )
        }
      />

      {expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <ExpenseFiltersBar filters={filters} onChange={setFilters} />
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
              <p className="text-sm text-slate-600" aria-live="polite">
                <span className="font-semibold text-slate-900">{filtered.length}</span> of {expenses.length} expenses ·{" "}
                <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(total)}</span>
              </p>
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="sort" className="text-slate-500">
                  Sort
                </label>
                <select
                  id="sort"
                  value={`${sortKey}-${sortDir}`}
                  onChange={(e) => {
                    const [k, d] = e.target.value.split("-") as [SortKey, SortDir];
                    setSortKey(k);
                    setSortDir(d);
                  }}
                  className="rounded-lg border-0 py-1.5 pl-2 pr-8 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Highest amount</option>
                  <option value="amount-asc">Lowest amount</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-900">No matching expenses</p>
                <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className={`${buttonSecondary} mt-4`}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <ExpenseList expenses={filtered.slice(0, visible)} onEdit={openEdit} onDelete={confirmDelete} />
                {visible < filtered.length && (
                  <div className="border-t border-slate-100 p-4 text-center">
                    <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className={buttonSecondary}>
                      Show more ({filtered.length - visible} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
