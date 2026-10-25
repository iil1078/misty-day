import { CATEGORIES, type Category, type ExpenseInput } from "./types";
import { todayISO } from "./format";

export interface ExpenseFormValues {
  date: string;
  amount: string;
  category: Category | "";
  description: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

export const MAX_AMOUNT = 1_000_000;
export const MAX_DESCRIPTION = 120;

export function validateExpense(values: ExpenseFormValues): {
  errors: ExpenseFormErrors;
  data?: ExpenseInput;
} {
  const errors: ExpenseFormErrors = {};

  if (!values.date) {
    errors.date = "Please choose a date.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Number.isNaN(Date.parse(values.date))) {
    errors.date = "Enter a valid date.";
  } else if (values.date > todayISO()) {
    errors.date = "Date can't be in the future.";
  } else if (values.date < "1970-01-01") {
    errors.date = "Date is too far in the past.";
  }

  const amountStr = values.amount.trim().replace(/[$,]/g, "");
  const amount = Number(amountStr);
  if (!amountStr) {
    errors.amount = "Please enter an amount.";
  } else if (amountStr.startsWith("-")) {
    errors.amount = "Amount must be greater than zero.";
  } else if (!/^\d+(\.\d{1,2})?$/.test(amountStr) || !Number.isFinite(amount)) {
    errors.amount = "Enter a valid amount with up to 2 decimals.";
  } else if (amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  } else if (amount > MAX_AMOUNT) {
    errors.amount = `Amount can't exceed $${MAX_AMOUNT.toLocaleString()}.`;
  }

  if (!values.category || !(CATEGORIES as readonly string[]).includes(values.category)) {
    errors.category = "Please select a category.";
  }

  const description = values.description.trim();
  if (!description) {
    errors.description = "Please add a short description.";
  } else if (description.length > MAX_DESCRIPTION) {
    errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    data: {
      date: values.date,
      amount: Math.round(amount * 100) / 100,
      category: values.category as Category,
      description,
    },
  };
}
