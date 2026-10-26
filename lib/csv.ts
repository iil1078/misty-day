import type { Expense } from "./types";

function escapeCell(value: string): string {
  // Neutralise spreadsheet formula injection, then quote if needed.
  let v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function expensesToCSV(expenses: Expense[]): string {
  const header = ["Date", "Category", "Description", "Amount"];
  const rows = expenses.map((e) =>
    [e.date, e.category, e.description, e.amount.toFixed(2)].map(escapeCell).join(","),
  );
  return [header.join(","), ...rows].join("\r\n");
}
