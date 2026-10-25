"use client";

import { ExpensesProvider } from "./ExpensesProvider";
import { ToastProvider } from "./ToastProvider";
import { ExpenseActionsProvider } from "./ExpenseActionsProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <ExpenseActionsProvider>{children}</ExpenseActionsProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
