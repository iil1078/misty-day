"use client";

import { CATEGORIES, EMPTY_FILTERS, type ExpenseFilters } from "@/lib/types";
import { toISODate } from "@/lib/format";

interface Props {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
}

const QUICK_RANGES: { label: string; range: () => { from: string; to: string } }[] = [
  {
    label: "This month",
    range: () => {
      const n = new Date();
      return { from: toISODate(new Date(n.getFullYear(), n.getMonth(), 1)), to: toISODate(n) };
    },
  },
  {
    label: "Last month",
    range: () => {
      const n = new Date();
      return {
        from: toISODate(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        to: toISODate(new Date(n.getFullYear(), n.getMonth(), 0)),
      };
    },
  },
  {
    label: "Last 30 days",
    range: () => {
      const n = new Date();
      return { from: toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 29)), to: toISODate(n) };
    },
  },
  {
    label: "This year",
    range: () => {
      const n = new Date();
      return { from: toISODate(new Date(n.getFullYear(), 0, 1)), to: toISODate(n) };
    },
  },
];

const control =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600";

export function ExpenseFiltersBar({ filters, onChange }: Props) {
  const set = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => onChange({ ...filters, [key]: value });
  const isFiltered =
    filters.search !== "" || filters.category !== "All" || filters.from !== "" || filters.to !== "";
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="relative sm:col-span-2 lg:col-span-4">
          <label htmlFor="search" className="sr-only">
            Search
          </label>
          <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden>
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            id="search"
            type="search"
            placeholder="Search descriptions…"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className={`${control} pl-9`}
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="category-filter" className="sr-only">
            Category
          </label>
          <select
            id="category-filter"
            value={filters.category}
            onChange={(e) => set("category", e.target.value as ExpenseFilters["category"])}
            className={control}
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 sm:col-span-1 lg:col-span-6">
          <label htmlFor="from" className="sr-only">
            From date
          </label>
          <input
            id="from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => set("from", e.target.value)}
            className={control}
            aria-invalid={!!rangeInvalid}
          />
          <span className="text-sm text-slate-400">to</span>
          <label htmlFor="to" className="sr-only">
            To date
          </label>
          <input
            id="to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => set("to", e.target.value)}
            className={control}
            aria-invalid={!!rangeInvalid}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_RANGES.map((q) => {
          const r = q.range();
          const active = filters.from === r.from && filters.to === r.to;
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => onChange({ ...filters, ...r })}
              aria-pressed={active}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                active ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {q.label}
            </button>
          );
        })}
        {isFiltered && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="ml-auto text-xs font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Clear filters
          </button>
        )}
      </div>
      {rangeInvalid && <p className="text-sm text-red-600">The start date is after the end date.</p>}
    </div>
  );
}
