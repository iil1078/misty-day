"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useExpenses } from "@/components/ExpensesProvider";
import { useExpenseActions } from "@/components/ExpenseActionsProvider";
import { SummaryCards } from "@/components/SummaryCards";
import { MonthlyChart } from "@/components/MonthlyChart";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { CategoryBadge } from "@/components/CategoryBadge";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardHeader, PageHeader, Skeleton, buttonSecondary } from "@/components/ui";
import { currentMonthKey, monthKey, monthlyTotals, previousMonthKey, sum, totalsByCategory } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";

type Period = "month" | "all";

export default function DashboardPage() {
  const { expenses, isLoading } = useExpenses();
  const { openEdit } = useExpenseActions();
  const [period, setPeriod] = useState<Period>("month");

  const stats = useMemo(() => {
    const now = new Date();
    const cur = currentMonthKey(now);
    const prev = previousMonthKey(now);
    const thisMonthExpenses = expenses.filter((e) => monthKey(e.date) === cur);
    const thisMonth = sum(thisMonthExpenses);
    const lastMonth = sum(expenses.filter((e) => monthKey(e.date) === prev));
    const monthCategories = totalsByCategory(thisMonthExpenses);
    const top = [...monthCategories].sort((a, b) => b.total - a.total)[0];
    return {
      total: sum(expenses),
      thisMonth,
      lastMonth,
      avgPerDay: thisMonth / now.getDate(),
      topCategory: top && top.total > 0 ? { category: top.category, total: top.total, share: top.total / thisMonth } : null,
      monthly: monthlyTotals(expenses, 6, now),
      categoriesMonth: monthCategories,
      categoriesAll: totalsByCategory(expenses),
    };
  }, [expenses]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        actions={
          expenses.length > 0 && (
            <button type="button" onClick={() => downloadCSV(expenses, `expenses-${todayISO()}.csv`)} className={buttonSecondary}>
              Export Data
            </button>
          )
        }
      />

      {expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <SummaryCards
            total={stats.total}
            totalCount={expenses.length}
            thisMonth={stats.thisMonth}
            lastMonth={stats.lastMonth}
            avgPerDay={stats.avgPerDay}
            topCategory={stats.topCategory}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Monthly spending" subtitle="Last 6 months" />
              <div className="px-3 pb-4 pt-1 sm:px-5">
                <MonthlyChart data={stats.monthly} />
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title="By category"
                subtitle={period === "month" ? "This month" : "All time"}
                action={
                  <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Period">
                    {(["month", "all"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        aria-pressed={period === p}
                        className={`rounded-md px-2.5 py-1 transition ${
                          period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {p === "month" ? "Month" : "All time"}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="px-5 pb-5 pt-4 sm:px-6">
                <CategoryBreakdown data={period === "month" ? stats.categoriesMonth : stats.categoriesAll} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Recent expenses"
              action={
                <Link href="/expenses" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                  View all →
                </Link>
              }
            />
            <ul className="mt-3 divide-y divide-slate-100">
              {expenses.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-slate-50 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <CategoryBadge category={e.category} />
                        <span>{formatDate(e.date)}</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(e.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
