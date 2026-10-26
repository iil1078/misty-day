"use client";

import { ExpensesProvider } from "./ExpensesProvider";
import { ToastProvider } from "./ToastProvider";
import { ExpenseActionsProvider } from "./ExpenseActionsProvider";
import { CloudProvider } from "./cloud/CloudProvider";
import { ActivityTray } from "./cloud/ActivityTray";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <CloudProvider>
          <ExpenseActionsProvider>{children}</ExpenseActionsProvider>
          <ActivityTray />
        </CloudProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
