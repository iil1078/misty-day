"use client";

import { CATEGORIES, CATEGORY_STYLES, type Category } from "@/lib/types";

interface Props {
  selected: Category[];
  onChange: (categories: Category[]) => void;
  /** Records per category within the current date range, so empty choices are obvious. */
  counts: Map<Category, number>;
}

export function CategoryPicker({ selected, onChange, counts }: Props) {
  const set = new Set(selected);
  const toggle = (c: Category) =>
    // Preserve canonical order regardless of click order.
    onChange(CATEGORIES.filter((x) => (x === c ? !set.has(c) : set.has(x))));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {selected.length === CATEGORIES.length ? "All" : selected.length} of {CATEGORIES.length} selected
        </span>
        <span className="flex gap-3 font-semibold">
          <button
            type="button"
            onClick={() => onChange([...CATEGORIES])}
            disabled={selected.length === CATEGORIES.length}
            className="text-indigo-600 hover:text-indigo-500 disabled:text-slate-300"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="text-indigo-600 hover:text-indigo-500 disabled:text-slate-300"
          >
            Clear
          </button>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Categories to include">
        {CATEGORIES.map((c) => {
          const on = set.has(c);
          const count = counts.get(c) ?? 0;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c)}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ring-1 ring-inset transition ${
                on ? "bg-white text-slate-900 shadow-sm ring-slate-300" : "bg-slate-100/60 text-slate-400 ring-transparent hover:text-slate-600"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${on ? "" : "ring-1 ring-inset ring-slate-300"}`}
                style={on ? { backgroundColor: CATEGORY_STYLES[c].color } : undefined}
                aria-hidden
              >
                {on && (
                  <svg viewBox="0 0 20 20" fill="white" className="h-3 w-3">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{c}</span>
              <span className={`text-xs tabular-nums ${on ? "text-slate-500" : "text-slate-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
