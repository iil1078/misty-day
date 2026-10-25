import { CATEGORIES, type Category, type Expense, type ExpenseFilters } from "./types";
import { toISODate } from "./format";

export function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  const q = filters.search.trim().toLowerCase();
  return expenses.filter((e) => {
    if (filters.category !== "All" && e.category !== filters.category) return false;
    if (filters.from && e.date < filters.from) return false;
    if (filters.to && e.date > filters.to) return false;
    if (q && !e.description.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

export function sum(expenses: Expense[]): number {
  // Sum in cents to avoid floating-point drift.
  return expenses.reduce((acc, e) => acc + Math.round(e.amount * 100), 0) / 100;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function totalsByCategory(expenses: Expense[]): { category: Category; total: number; count: number }[] {
  const map = new Map<Category, { total: number; count: number }>();
  for (const c of CATEGORIES) map.set(c, { total: 0, count: 0 });
  for (const e of expenses) {
    const entry = map.get(e.category)!;
    entry.total += Math.round(e.amount * 100);
    entry.count += 1;
  }
  return CATEGORIES.map((category) => ({
    category,
    total: map.get(category)!.total / 100,
    count: map.get(category)!.count,
  }));
}

/** Totals for the last `months` calendar months, oldest first, including empty months. */
export function monthlyTotals(expenses: Expense[], months = 6, now = new Date()): { key: string; total: number }[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(toISODate(d).slice(0, 7));
  }
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const e of expenses) {
    const k = monthKey(e.date);
    if (totals.has(k)) totals.set(k, totals.get(k)! + Math.round(e.amount * 100));
  }
  return keys.map((key) => ({ key, total: totals.get(key)! / 100 }));
}

export function currentMonthKey(now = new Date()): string {
  return toISODate(now).slice(0, 7);
}

export function previousMonthKey(now = new Date()): string {
  return toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
}
