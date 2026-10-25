"use client";

import { useExpenses } from "./ExpensesProvider";

export function StorageErrorBanner() {
  const { error } = useExpenses();
  if (!error) return null;
  return (
    <div role="alert" className="border-b border-red-200 bg-red-50">
      <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-red-800 sm:px-6">{error}</div>
    </div>
  );
}
