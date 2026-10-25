import type { Expense } from "./types";

function escapeCell(value: string): string {
  // Neutralise spreadsheet formula injection, then quote if needed.
  let v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function expensesToCSV(expenses: Expense[]): string {
  const header = ["Date", "Category", "Amount", "Description"];
  const rows = expenses.map((e) =>
    [e.date, e.category, e.amount.toFixed(2), e.description].map(escapeCell).join(","),
  );
  return [header.join(","), ...rows].join("\r\n");
}

export function downloadCSV(expenses: Expense[], filename: string): void {
  // BOM so Excel detects UTF-8.
  const blob = new Blob(["﻿" + expensesToCSV(expenses)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the browser has started the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
