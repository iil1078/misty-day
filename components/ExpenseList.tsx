"use client";

import type { Expense } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { CategoryBadge } from "./CategoryBadge";

interface Props {
  expenses: Expense[];
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}

export type SortKey = "date" | "amount";
export type SortDir = "asc" | "desc";

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 text-slate-400 transition ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-700"}`}
    >
      {children}
    </button>
  );
}

const EditIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
  </svg>
);

const DeleteIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
  </svg>
);

export function ExpenseList({ expenses, onEdit, onDelete }: Props) {
  return (
    <>
      {/* Desktop table */}
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="px-6 py-3 font-medium">Date</th>
            <th className="px-3 py-3 font-medium">Description</th>
            <th className="px-3 py-3 font-medium">Category</th>
            <th className="px-3 py-3 text-right font-medium">Amount</th>
            <th className="w-24 px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {expenses.map((e) => (
            <tr key={e.id} className="group transition hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-6 py-3 text-slate-500">{formatDate(e.date)}</td>
              <td className="max-w-xs truncate px-3 py-3 font-medium text-slate-900">{e.description}</td>
              <td className="px-3 py-3">
                <CategoryBadge category={e.category} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(e.amount)}</td>
              <td className="px-6 py-1.5 text-right">
                <div className="flex justify-end gap-0.5 opacity-60 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <IconButton label={`Edit ${e.description}`} onClick={() => onEdit(e)}>
                    {EditIcon}
                  </IconButton>
                  <IconButton label={`Delete ${e.description}`} onClick={() => onDelete(e)} danger>
                    {DeleteIcon}
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {expenses.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
                <p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(e.amount)}</p>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <CategoryBadge category={e.category} />
                <span>{formatDate(e.date)}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <IconButton label={`Edit ${e.description}`} onClick={() => onEdit(e)}>
                {EditIcon}
              </IconButton>
              <IconButton label={`Delete ${e.description}`} onClick={() => onDelete(e)} danger>
                {DeleteIcon}
              </IconButton>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
