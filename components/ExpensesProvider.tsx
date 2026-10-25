"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Expense, ExpenseInput } from "@/lib/types";
import { generateId, loadExpenses, saveExpenses } from "@/lib/storage";
import { sortExpenses } from "@/lib/analytics";

interface ExpensesContextValue {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => Expense | undefined;
  restoreExpense: (expense: Expense) => void;
  importExpenses: (inputs: ExpenseInput[]) => void;
  clearAll: () => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Load once on mount (localStorage is client-only).
  useEffect(() => {
    try {
      setExpenses(sortExpenses(loadExpenses()));
    } catch (e) {
      console.error(e);
      setError("We couldn't read your saved expenses. Stored data may be corrupted.");
    } finally {
      hydrated.current = true;
      setIsLoading(false);
    }
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      saveExpenses(expenses);
    } catch (e) {
      console.error(e);
      setError("Changes couldn't be saved. Your browser storage may be full or disabled.");
    }
  }, [expenses]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key.startsWith("expense-tracker:")) {
        try {
          setExpenses(sortExpenses(loadExpenses()));
        } catch {
          /* ignore malformed cross-tab writes */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addExpense = useCallback((input: ExpenseInput) => {
    const now = new Date().toISOString();
    const expense: Expense = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    setExpenses((prev) => sortExpenses([expense, ...prev]));
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    setExpenses((prev) =>
      sortExpenses(prev.map((e) => (e.id === id ? { ...e, ...input, updatedAt: new Date().toISOString() } : e))),
    );
  }, []);

  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;

  const deleteExpense = useCallback((id: string) => {
    const removed = expensesRef.current.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    return removed;
  }, []);

  const restoreExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => (prev.some((e) => e.id === expense.id) ? prev : sortExpenses([expense, ...prev])));
  }, []);

  const importExpenses = useCallback((inputs: ExpenseInput[]) => {
    const now = new Date().toISOString();
    setExpenses((prev) =>
      sortExpenses([...prev, ...inputs.map((input) => ({ ...input, id: generateId(), createdAt: now, updatedAt: now }))]),
    );
  }, []);

  const clearAll = useCallback(() => setExpenses([]), []);

  const value = useMemo(
    () => ({ expenses, isLoading, error, addExpense, updateExpense, deleteExpense, restoreExpense, importExpenses, clearAll }),
    [expenses, isLoading, error, addExpense, updateExpense, deleteExpense, restoreExpense, importExpenses, clearAll],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpensesProvider");
  return ctx;
}
