"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_STYLES, type Expense, type ExpenseInput } from "@/lib/types";
import { todayISO } from "@/lib/format";
import {
  MAX_DESCRIPTION,
  validateExpense,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from "@/lib/validation";

interface ExpenseFormProps {
  initial?: Expense;
  onSubmit: (data: ExpenseInput) => Promise<void> | void;
  onCancel: () => void;
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(() => ({
    date: initial?.date ?? todayISO(),
    amount: initial ? initial.amount.toFixed(2) : "",
    category: initial?.category ?? "",
    description: initial?.description ?? "",
  }));
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ExpenseFormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // Re-validate live once a field has been touched, so errors clear as the user fixes them.
    if (touched[key]) setErrors(validateExpense(next).errors);
  };

  const blur = (key: keyof ExpenseFormValues) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validateExpense(values).errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateExpense(values);
    setErrors(result.errors);
    setTouched({ date: true, amount: true, category: true, description: true });
    if (!result.data) return;
    setSubmitting(true);
    try {
      await onSubmit(result.data);
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (key: keyof ExpenseFormValues) => (touched[key] ? errors[key] : undefined);

  const inputClass = (key: keyof ExpenseFormValues) =>
    `block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset ${
      showError(key) ? "ring-red-300 focus:ring-red-500" : "ring-slate-300 focus:ring-indigo-600"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Amount" htmlFor="amount" error={showError("amount")}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500">$</span>
            <input
              id="amount"
              data-autofocus
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={values.amount}
              onChange={(e) => set("amount", e.target.value)}
              onBlur={() => blur("amount")}
              aria-invalid={!!showError("amount")}
              aria-describedby={showError("amount") ? "amount-error" : undefined}
              className={`${inputClass("amount")} pl-7 tabular-nums`}
            />
          </div>
        </Field>

        <Field label="Date" htmlFor="date" error={showError("date")}>
          <input
            id="date"
            type="date"
            max={todayISO()}
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
            onBlur={() => blur("date")}
            aria-invalid={!!showError("date")}
            aria-describedby={showError("date") ? "date-error" : undefined}
            className={inputClass("date")}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-slate-700">Category</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-describedby={showError("category") ? "category-error" : undefined}>
          {CATEGORIES.map((c) => {
            const selected = values.category === c;
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset transition ${
                  selected
                    ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600"
                    : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={selected}
                  onChange={() => {
                    setTouched((t) => ({ ...t, category: true }));
                    const next = { ...values, category: c };
                    setValues(next);
                    setErrors(validateExpense(next).errors);
                  }}
                  className="sr-only"
                />
                <span aria-hidden>{CATEGORY_STYLES[c].icon}</span>
                {c}
              </label>
            );
          })}
        </div>
        {showError("category") && (
          <p id="category-error" className="mt-1.5 text-sm text-red-600">
            {showError("category")}
          </p>
        )}
      </fieldset>

      <Field
        label="Description"
        htmlFor="description"
        error={showError("description")}
        hint={`${values.description.trim().length}/${MAX_DESCRIPTION}`}
      >
        <input
          id="description"
          placeholder="e.g. Weekly groceries"
          maxLength={MAX_DESCRIPTION + 20}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          onBlur={() => blur("description")}
          aria-invalid={!!showError("description")}
          aria-describedby={showError("description") ? "description-error" : undefined}
          className={inputClass("description")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
        >
          {submitting && <Spinner />}
          {initial ? "Save changes" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint && <span className="text-xs tabular-nums text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
