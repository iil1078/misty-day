"use client";

import { ExpensesProvider } from "./ExpensesProvider";
import { ToastProvider } from "./ToastProvider";
import { ExpenseActionsProvider } from "./ExpenseActionsProvider";
import { ExportProvider } from "./export/ExportProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <ExpenseActionsProvider>
          <ExportProvider>{children}</ExportProvider>
        </ExpenseActionsProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
