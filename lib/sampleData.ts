import type { Category, ExpenseInput } from "./types";
import { toISODate } from "./format";

const TEMPLATES: { category: Category; items: [string, number, number][] }[] = [
  { category: "Food", items: [["Groceries", 40, 140], ["Coffee", 3, 7], ["Lunch with team", 12, 35], ["Dinner out", 30, 90]] },
  { category: "Transportation", items: [["Gas", 35, 70], ["Train pass", 25, 25], ["Rideshare", 9, 30], ["Parking", 5, 20]] },
  { category: "Entertainment", items: [["Movie tickets", 15, 35], ["Streaming subscription", 15, 15], ["Concert", 45, 120]] },
  { category: "Shopping", items: [["Clothing", 25, 150], ["Home supplies", 15, 60], ["Electronics", 40, 300]] },
  { category: "Bills", items: [["Electricity", 60, 120], ["Internet", 65, 65], ["Phone plan", 45, 45], ["Rent", 1400, 1400]] },
  { category: "Other", items: [["Gift", 20, 80], ["Haircut", 25, 45], ["Donation", 10, 50]] },
];

/** Deterministic pseudo-random generator so sample data is stable per load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSampleExpenses(now = new Date()): ExpenseInput[] {
  const rand = mulberry32(42);
  const out: ExpenseInput[] = [];
  for (let m = 5; m >= 0; m--) {
    const year = now.getFullYear();
    const month = now.getMonth() - m;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = m === 0 ? now.getDate() : daysInMonth;

    // Monthly bills on the 1st-5th
    out.push({ date: toISODate(new Date(year, month, 1)), amount: 1400, category: "Bills", description: "Rent" });
    out.push({ date: toISODate(new Date(year, month, Math.min(5, lastDay))), amount: 65, category: "Bills", description: "Internet" });

    const count = Math.round(((14 + rand() * 8) * lastDay) / daysInMonth);
    for (let i = 0; i < count; i++) {
      const group = TEMPLATES[Math.floor(rand() * TEMPLATES.length)];
      const [description, min, max] = group.items[Math.floor(rand() * group.items.length)];
      if (description === "Rent" || description === "Internet") continue;
      const amount = Math.round((min + rand() * (max - min)) * 100) / 100;
      const day = 1 + Math.floor(rand() * lastDay);
      out.push({ date: toISODate(new Date(year, month, day)), amount, category: group.category, description });
    }
  }
  return out;
}
