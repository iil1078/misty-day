export const CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  /** ISO date string, YYYY-MM-DD (local calendar date, no time component) */
  date: string;
  /** Amount in the currency's major unit, e.g. 12.5 = $12.50 */
  amount: number;
  category: Category;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Pick<Expense, "date" | "amount" | "category" | "description">;

export interface ExpenseFilters {
  search: string;
  category: Category | "All";
  from: string;
  to: string;
}

export const EMPTY_FILTERS: ExpenseFilters = {
  search: "",
  category: "All",
  from: "",
  to: "",
};

/**
 * Fixed color per category (identity follows the entity, never its rank).
 * Hues are the validated categorical slots 1-5; "Other" is a neutral gray.
 */
export const CATEGORY_STYLES: Record<
  Category,
  { color: string; badge: string; icon: string }
> = {
  Food: { color: "#2a78d6", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", icon: "🍽️" },
  Transportation: { color: "#eb6834", badge: "bg-orange-50 text-orange-700 ring-orange-600/20", icon: "🚗" },
  Entertainment: { color: "#1baf7a", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: "🎬" },
  Shopping: { color: "#eda100", badge: "bg-amber-50 text-amber-800 ring-amber-600/20", icon: "🛍️" },
  Bills: { color: "#e87ba4", badge: "bg-pink-50 text-pink-700 ring-pink-600/20", icon: "🧾" },
  Other: { color: "#8a8985", badge: "bg-slate-100 text-slate-700 ring-slate-500/20", icon: "📦" },
};
