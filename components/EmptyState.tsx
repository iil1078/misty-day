"use client";

import { useExpenses } from "./ExpensesProvider";
import { useExpenseActions } from "./ExpenseActionsProvider";
import { useToast } from "./ToastProvider";
import { generateSampleExpenses } from "@/lib/sampleData";
import { buttonPrimary, buttonSecondary } from "./ui";

export function EmptyState() {
  const { importExpenses } = useExpenses();
  const { openAdd } = useExpenseActions();
  const { toast } = useToast();

  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl" aria-hidden>
        💸
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">No expenses yet</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Start tracking where your money goes. Add your first expense, or load some sample data to explore the app.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={openAdd} className={buttonPrimary}>
          Add your first expense
        </button>
        <button
          type="button"
          onClick={() => {
            const sample = generateSampleExpenses();
            importExpenses(sample);
            toast(`Loaded ${sample.length} sample expenses`);
          }}
          className={buttonSecondary}
        >
          Load sample data
        </button>
      </div>
    </div>
  );
}
