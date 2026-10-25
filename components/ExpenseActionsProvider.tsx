"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Expense } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { Modal } from "./Modal";
import { ExpenseForm } from "./ExpenseForm";
import { useExpenses } from "./ExpensesProvider";
import { useToast } from "./ToastProvider";

interface ExpenseActionsContextValue {
  openAdd: () => void;
  openEdit: (expense: Expense) => void;
  confirmDelete: (expense: Expense) => void;
}

const ExpenseActionsContext = createContext<ExpenseActionsContextValue | null>(null);

type DialogState =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; expense: Expense }
  | { kind: "delete"; expense: Expense };

/** Owns the add / edit / delete dialogs so any page or component can trigger them. */
export function ExpenseActionsProvider({ children }: { children: React.ReactNode }) {
  const { addExpense, updateExpense, deleteExpense, restoreExpense } = useExpenses();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });

  const close = useCallback(() => setDialog({ kind: "closed" }), []);
  const openAdd = useCallback(() => setDialog({ kind: "add" }), []);
  const openEdit = useCallback((expense: Expense) => setDialog({ kind: "edit", expense }), []);
  const confirmDelete = useCallback((expense: Expense) => setDialog({ kind: "delete", expense }), []);

  const handleDelete = (expense: Expense) => {
    const removed = deleteExpense(expense.id);
    close();
    if (removed) {
      toast(`Deleted "${removed.description}"`, {
        variant: "info",
        action: { label: "Undo", onClick: () => restoreExpense(removed) },
      });
    }
  };

  return (
    <ExpenseActionsContext.Provider value={{ openAdd, openEdit, confirmDelete }}>
      {children}

      <Modal
        open={dialog.kind === "add" || dialog.kind === "edit"}
        onClose={close}
        title={dialog.kind === "edit" ? "Edit expense" : "Add expense"}
        description={dialog.kind === "edit" ? "Update the details of this expense." : "Record a new expense."}
      >
        {(dialog.kind === "add" || dialog.kind === "edit") && (
          <ExpenseForm
            key={dialog.kind === "edit" ? dialog.expense.id : "new"}
            initial={dialog.kind === "edit" ? dialog.expense : undefined}
            onCancel={close}
            onSubmit={(data) => {
              if (dialog.kind === "edit") {
                updateExpense(dialog.expense.id, data);
                toast("Expense updated");
              } else {
                addExpense(data);
                toast(`Added ${formatCurrency(data.amount)} for ${data.category}`);
              }
              close();
            }}
          />
        )}
      </Modal>

      <Modal open={dialog.kind === "delete"} onClose={close} title="Delete expense?" size="sm">
        {dialog.kind === "delete" && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{dialog.expense.description}</span> (
              {formatCurrency(dialog.expense.amount)}) will be removed. You can undo this right after.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-autofocus
                onClick={() => handleDelete(dialog.expense)}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </ExpenseActionsContext.Provider>
  );
}

export function useExpenseActions(): ExpenseActionsContextValue {
  const ctx = useContext(ExpenseActionsContext);
  if (!ctx) throw new Error("useExpenseActions must be used within ExpenseActionsProvider");
  return ctx;
}
