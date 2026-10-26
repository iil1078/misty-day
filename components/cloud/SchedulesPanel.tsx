"use client";

import { DESTINATIONS } from "@/lib/cloud/destinations";
import { PERIOD_LABELS } from "@/lib/cloud/periods";
import { describeTiming } from "@/lib/cloud/schedule";
import { TEMPLATES } from "@/lib/cloud/templates";
import type { Schedule } from "@/lib/cloud/types";
import { formatDateTime, relativeTime } from "@/lib/cloud/util";
import { buttonPrimary, buttonSecondary } from "../ui";
import { useCloud, useNow } from "./CloudProvider";
import { StatusChip } from "./controls";
import { SCHEDULE_PRESETS, type ScheduleDraft } from "./ScheduleDialog";
import { ServiceLogo } from "./ServiceLogo";

export function SchedulesPanel({ onCreate, onEdit }: { onCreate: (preset?: ScheduleDraft) => void; onEdit: (s: Schedule) => void }) {
  const { state, saveSchedule, deleteSchedule, runExport } = useCloud();
  const now = useNow(15_000);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-500">
          Automatic exports run in the background while Spendwise is open. If it was closed when a run was due, it catches up the next time you visit.
        </p>
        <button type="button" onClick={() => onCreate()} className={buttonPrimary}>
          + New schedule
        </button>
      </div>

      {state.schedules.length > 0 && (
        <ul className="space-y-3">
          {state.schedules.map((s) => {
            const runs = state.jobs.filter((j) => j.scheduleId === s.id);
            const last = runs[0];
            const kept = runs.filter((j) => j.status === "completed" && !j.pruned).length;
            const needsConnection = DESTINATIONS[s.destinationId].requiresConnection && !state.connections[s.destinationId];
            return (
              <li key={s.id} className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition ${s.active ? "" : "opacity-70"}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="relative">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-xl ring-1 ring-slate-200" aria-hidden>
                      {TEMPLATES[s.templateId].icon}
                    </span>
                    <ServiceLogo id={s.destinationId} className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-md ring-2 ring-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{s.name}</h4>
                      {!s.active ? (
                        <StatusChip tone="slate">Paused</StatusChip>
                      ) : needsConnection ? (
                        <StatusChip tone="amber">Reconnect {DESTINATIONS[s.destinationId].name}</StatusChip>
                      ) : (
                        <StatusChip tone="green">Active</StatusChip>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {describeTiming(s)} · {TEMPLATES[s.templateId].name} ({PERIOD_LABELS[s.periodId].toLowerCase()}) → {DESTINATIONS[s.destinationId].name}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      <span>
                        Next run{" "}
                        <span className="font-medium text-slate-800" title={formatDateTime(s.nextRunAt)}>
                          {s.active ? relativeTime(s.nextRunAt, now) : "—"}
                        </span>
                      </span>
                      <span>
                        Last run{" "}
                        <span className={`font-medium ${last?.status === "failed" ? "text-red-600" : "text-slate-800"}`}>
                          {last ? `${relativeTime(last.createdAt, now)}${last.status === "failed" ? " (failed)" : ""}` : "never"}
                        </span>
                      </span>
                      <span>
                        Keeping <span className="font-medium text-slate-800">{kept}</span> of {s.retention} copies
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        runExport({ templateId: s.templateId, periodId: s.periodId, destinationId: s.destinationId, trigger: "schedule", scheduleId: s.id, detail: `${s.name} (run now)` })
                      }
                      className={buttonSecondary}
                    >
                      Run now
                    </button>
                    <button type="button" onClick={() => saveSchedule({ ...s, active: !s.active })} className={buttonSecondary}>
                      {s.active ? "Pause" : "Resume"}
                    </button>
                    <button type="button" onClick={() => onEdit(s)} className="rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSchedule(s.id)}
                      className="rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${s.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {state.schedules.length ? "More ideas" : "Start from a recipe"}
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {SCHEDULE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onCreate(p)}
              className="group flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-left transition hover:border-indigo-400 hover:bg-white"
            >
              <span className="text-2xl" aria-hidden>
                {TEMPLATES[p.templateId].icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{p.name}</span>
                <span className="block text-xs text-slate-500">{p.blurb}</span>
              </span>
              <ServiceLogo id={p.destinationId} className="h-6 w-6 opacity-70 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
