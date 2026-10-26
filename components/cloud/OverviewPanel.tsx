"use client";

import { useMemo, useState } from "react";
import { sum } from "@/lib/analytics";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { PERIOD_LABELS, inPeriod, resolvePeriod } from "@/lib/cloud/periods";
import { TEMPLATES, TEMPLATE_ORDER } from "@/lib/cloud/templates";
import type { PeriodId, TemplateId } from "@/lib/cloud/types";
import { relativeTime } from "@/lib/cloud/util";
import { useExpenses } from "../ExpensesProvider";
import { buttonSecondary } from "../ui";
import { useCloud, useNow } from "./CloudProvider";
import { SCHEDULE_PRESETS, type ScheduleDraft } from "./ScheduleDialog";
import { ServiceLogo } from "./ServiceLogo";
import type { HubTab } from "./tabs";

interface Props {
  onRun: (templateId: TemplateId) => void;
  onEmail: (templateId: TemplateId, periodId?: PeriodId) => void;
  onSheets: () => void;
  onSchedule: (preset?: ScheduleDraft) => void;
  onTab: (tab: HubTab) => void;
}

interface Suggestion {
  id: string;
  icon: string;
  title: string;
  body: string;
  cta: string;
  action: () => void;
}

export function OverviewPanel({ onRun, onEmail, onSheets, onSchedule, onTab }: Props) {
  const { expenses } = useExpenses();
  const { state, runExport } = useCloud();
  const now = useNow();
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Context-aware nudges derived from the user's own data and setup.
  const suggestions = useMemo(() => {
    const out: Suggestion[] = [];
    const today = new Date();
    const last = resolvePeriod("last-month", today);
    const lastTotal = sum(inPeriod(expenses, last));
    const thisTotal = sum(inPeriod(expenses, resolvePeriod("this-month", today)));
    if (today.getDate() <= 10 && lastTotal > 0) {
      out.push({
        id: "month-closed",
        icon: "📅",
        title: `${last.label} just closed`,
        body: "Send the monthly summary while it's fresh — to yourself, a partner, or a shared channel.",
        cta: "Email the summary",
        action: () => onEmail("monthly-summary", "last-month"),
      });
    }
    if (state.schedules.length === 0) {
      out.push({
        id: "backup",
        icon: "🛟",
        title: "Your data only lives in this browser",
        body: "Clearing site data would erase it. An automatic weekly backup takes ten seconds to set up.",
        cta: "Automate backups",
        action: () => onSchedule(SCHEDULE_PRESETS[0]),
      });
    }
    if (lastTotal > 0 && thisTotal > lastTotal) {
      out.push({
        id: "overspend",
        icon: "📈",
        title: `Already ${Math.round(((thisTotal - lastTotal) / lastTotal) * 100)}% above last month`,
        body: "Share a read-only snapshot with whoever you budget with — no account needed.",
        cta: "Share a snapshot",
        action: () => onTab("share"),
      });
    }
    if (!state.connections["google-sheets"]) {
      out.push({
        id: "sheets",
        icon: "📗",
        title: "Live in spreadsheets?",
        body: "Keep a Google Sheet that updates itself every time you log an expense.",
        cta: "Set up live sync",
        action: onSheets,
      });
    }
    return out.filter((s) => !dismissed.includes(s.id)).slice(0, 3);
  }, [expenses, state.schedules.length, state.connections, dismissed, onEmail, onSchedule, onSheets, onTab]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const stats = [
    { label: "Connected services", value: Object.keys(state.connections).length, tab: "integrations" as const },
    { label: "Active schedules", value: state.schedules.filter((s) => s.active).length, tab: "schedules" as const },
    { label: "Exports this month", value: state.jobs.filter((j) => j.createdAt >= monthStart).length, tab: "history" as const },
    { label: "Live share links", value: state.shares.filter((s) => !s.expiresAt || new Date(s.expiresAt).getTime() > now).length, tab: "share" as const },
  ];

  const quickActions = [
    { title: "Email a report", body: "Send to your accountant", logo: <ServiceLogo id="email" className="h-9 w-9" />, onClick: () => onEmail("monthly-summary") },
    { title: "Sync to Sheets", body: "A spreadsheet that updates itself", logo: <ServiceLogo id="google-sheets" className="h-9 w-9" />, onClick: onSheets },
    { title: "Share a snapshot", body: "Link + QR code, no login", logo: <Emoji>🔗</Emoji>, onClick: () => onTab("share") },
    { title: "Automate", body: "Recurring exports & backups", logo: <Emoji>⏰</Emoji>, onClick: () => onSchedule() },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="text-sm font-medium text-indigo-100">Share & Export</p>
          <h2 className="mt-1 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">Your expenses, everywhere they need to be.</h2>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            Send reports, sync spreadsheets, automate backups and share live snapshots — all from one place.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onTab(s.tab)}
                className="rounded-2xl bg-white/10 px-4 py-3 text-left ring-1 ring-inset ring-white/15 backdrop-blur transition hover:bg-white/15"
              >
                <dd className="text-2xl font-semibold tabular-nums">{s.value}</dd>
                <dt className="text-xs text-indigo-100">{s.label}</dt>
              </button>
            ))}
          </dl>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map((a) => (
          <button
            key={a.title}
            type="button"
            onClick={a.onClick}
            className="group flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-200"
          >
            {a.logo}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">{a.title}</span>
              <span className="block truncate text-xs text-slate-500">{a.body}</span>
            </span>
          </button>
        ))}
      </section>

      {suggestions.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span aria-hidden>✨</span> Suggested for you
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {suggestions.map((s) => (
              <div key={s.id} className="relative flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-100">
                <button
                  type="button"
                  onClick={() => setDismissed((d) => [...d, s.id])}
                  className="absolute right-2 top-2 rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                  aria-label={`Dismiss suggestion: ${s.title}`}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
                <span className="text-2xl" aria-hidden>
                  {s.icon}
                </span>
                <p className="mt-2 pr-6 text-sm font-semibold text-slate-900">{s.title}</p>
                <p className="mt-1 flex-1 text-xs text-slate-500">{s.body}</p>
                <button type="button" onClick={s.action} className="mt-3 self-start text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                  {s.cta} →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Templates</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {TEMPLATE_ORDER.map((id) => {
              const t = TEMPLATES[id];
              return (
                <article key={id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ring-1 ${t.tint}`} aria-hidden>
                      {t.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{t.name}</h4>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{t.format}</span>
                      </div>
                      <p className="text-xs font-medium text-indigo-600">{t.audience}</p>
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-slate-500">{t.description}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={() => onRun(id)} className={buttonSecondary}>
                      Use template
                    </button>
                    <button
                      type="button"
                      onClick={() => runExport({ templateId: id, periodId: t.defaultPeriod, destinationId: "download" })}
                      className="rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      title={`Download ${PERIOD_LABELS[t.defaultPeriod].toLowerCase()} now`}
                    >
                      Quick download
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent activity</h3>
            {state.jobs.length > 0 && (
              <button type="button" onClick={() => onTab("history")} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">
                View all
              </button>
            )}
          </div>
          <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200/70">
            {state.jobs.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">Exports you run will appear here.</p>
            ) : (
              <ol className="relative space-y-1 before:absolute before:bottom-4 before:left-[1.4rem] before:top-4 before:w-px before:bg-slate-200">
                {state.jobs.slice(0, 6).map((j) => (
                  <li key={j.id} className="relative flex items-center gap-3 rounded-xl px-2 py-2">
                    <span className="relative z-10 rounded-lg bg-white">
                      <ServiceLogo id={j.destinationId} className="h-7 w-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800">
                        {TEMPLATES[j.templateId].name} → {DESTINATIONS[j.destinationId].name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {j.status === "completed" ? "✓ " : j.status === "failed" ? "✕ " : "⋯ "}
                        {j.status === "running" || j.status === "queued" ? j.stage : relativeTime(j.createdAt, now)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Emoji({ children }: { children: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg" aria-hidden>
      {children}
    </span>
  );
}
