import { Spinner } from "./ExpenseForm";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageLoading({ label = "Loading your expenses…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500" role="status">
      <Spinner className="h-6 w-6 text-indigo-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export const buttonSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50";
