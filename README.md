# Spendwise — Expense Tracker

A personal expense tracker built with Next.js 14 (App Router), TypeScript and Tailwind CSS. Data is stored in your browser's `localStorage`.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
# or production:
npm run build && npm start
```

Other scripts: `npm run lint`, `npm run typecheck`.

## Features

- **Dashboard**: total, this-month (with change vs last month), daily average, and top category cards; a 6-month spending bar chart (hover for values, "Show table" for an accessible table view); a category breakdown (this month / all time); recent expenses (click one to edit).
- **Expenses**: search descriptions, filter by category and date range (plus quick ranges), sort by date or amount, "Show more" paging, edit/delete per row, export the filtered list to CSV.
- **Add/Edit form**: amount, native date picker (future dates blocked), category picker, description; validated on blur and on submit.
- **Feedback**: toast notifications, delete confirmation with **Undo**, loading skeletons, empty states, and a banner if storage can't be read or written.
- Responsive layout (table on desktop, cards on mobile); data syncs across open tabs.

## Project structure

```
app/                  layout, dashboard (page.tsx), expenses/page.tsx
components/           UI: providers (data, toasts, add/edit/delete dialogs), charts, form, list, filters
lib/                  types, validation, analytics, CSV, formatting, storage, sample data
```

## Notes

- Currency is USD (`lib/format.ts`). Amounts are summed in cents to avoid floating-point drift.
- The CSV export escapes quotes and commas and blocks spreadsheet formula injection.
- To reset all data, run `localStorage.removeItem("expense-tracker:expenses:v1")` in the browser console.
