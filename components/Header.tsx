"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExpenseActions } from "./ExpenseActionsProvider";
import { useExpenses } from "./ExpensesProvider";
import { useExport } from "./export/ExportProvider";
import { buttonSecondary } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
];

export function Header() {
  const pathname = usePathname();
  const { openAdd } = useExpenseActions();
  const { openExport } = useExport();
  const { expenses, isLoading } = useExpenses();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l2-3h14l2 3M16 13h2" />
            </svg>
          </span>
          <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:block">Spendwise</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => openExport()}
          disabled={isLoading || expenses.length === 0}
          title={expenses.length === 0 ? "Add an expense to enable exports" : "Export expenses"}
          className={`${buttonSecondary} ml-auto`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          <span className="hidden sm:inline">Export</span>
          <span className="sr-only sm:hidden">Export</span>
        </button>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:px-4"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          <span>
            Add<span className="hidden sm:inline"> expense</span>
          </span>
        </button>
      </div>
    </header>
  );
}
