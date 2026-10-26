"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExpenseActions } from "./ExpenseActionsProvider";
import { SyncStatus } from "./cloud/SyncStatus";

const NAV: { href: string; label: string; short?: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
  { href: "/exports", label: "Share & Export", short: "Share" },
];

export function Header() {
  const pathname = usePathname();
  const { openAdd } = useExpenseActions();
  // Recipients of a shared snapshot see a minimal, read-only header.
  const isSharedView = pathname.startsWith("/share");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l2-3h14l2 3M16 13h2" />
            </svg>
          </span>
          <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:block">Spendwise</span>
        </Link>

        {isSharedView ? (
          <span className="ml-auto text-xs font-medium text-slate-500">Shared via Spendwise</span>
        ) : (
          <>
            <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main">
              {NAV.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-2 py-2 text-sm font-medium transition sm:px-3 ${
                      active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {item.short ? (
                      <>
                        <span className="whitespace-nowrap sm:hidden">{item.short}</span>
                        <span className="hidden whitespace-nowrap sm:inline">{item.label}</span>
                      </>
                    ) : (
                      <span className="whitespace-nowrap">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Too tight for the status pill on phones; status remains on the Share & Export page and activity tray. */}
            <div className="ml-auto hidden sm:block">
              <SyncStatus />
            </div>

            <button
              type="button"
              onClick={openAdd}
              className="ml-auto inline-flex sm:ml-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:px-4"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span className="sr-only sm:not-sr-only">
                Add<span className="hidden sm:inline"> expense</span>
              </span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
