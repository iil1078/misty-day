"use client";

import { useState } from "react";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { PERIOD_LABELS } from "@/lib/cloud/periods";
import { FREQUENCY_LABELS, WEEKDAYS, computeNextRun, describeTiming, upcomingRuns } from "@/lib/cloud/schedule";
import { TEMPLATES, TEMPLATE_ORDER } from "@/lib/cloud/templates";
import type { DestinationId, Frequency, PeriodId, Schedule, TemplateId } from "@/lib/cloud/types";
import { uid } from "@/lib/cloud/util";
import { Modal } from "../Modal";
import { buttonPrimary, buttonSecondary } from "../ui";
import { useCloud } from "./CloudProvider";
import { Field, inputClass } from "./controls";
import { ServiceLogo } from "./ServiceLogo";

export type ScheduleDraft = Pick<Schedule, "name" | "templateId" | "periodId" | "destinationId" | "frequency" | "weekday" | "monthDay" | "time" | "retention">;

export const SCHEDULE_PRESETS: (ScheduleDraft & { blurb: string })[] = [
  { name: "Weekly backup", blurb: "Full backup every Monday morning", templateId: "full-backup", periodId: "all", destinationId: "google-drive", frequency: "weekly", weekday: 1, monthDay: 1, time: "08:00", retention: 8 },
  { name: "Monthly summary", blurb: "Last month's digest on the 1st", templateId: "monthly-summary", periodId: "last-month", destinationId: "email", frequency: "monthly", weekday: 1, monthDay: 1, time: "09:00", retention: 12 },
  { name: "Budget check-in", blurb: "Category analysis to Dropbox, monthly", templateId: "category-analysis", periodId: "this-year", destinationId: "dropbox", frequency: "monthly", weekday: 1, monthDay: 2, time: "18:00", retention: 6 },
];

const DEFAULT_DRAFT: ScheduleDraft = SCHEDULE_PRESETS[0];

export function ScheduleDialog({
  existing,
  preset,
  onClose,
  onConnect,
}: {
  existing?: Schedule;
  preset?: ScheduleDraft;
  onClose: () => void;
  onConnect: (id: DestinationId) => void;
}) {
  const { state, saveSchedule } = useCloud();
  const [draft, setDraft] = useState<ScheduleDraft>(existing ?? preset ?? DEFAULT_DRAFT);
  const set = <K extends keyof ScheduleDraft>(k: K, v: ScheduleDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const template = TEMPLATES[draft.templateId];

  const destinationOptions = (Object.keys(DESTINATIONS) as DestinationId[]).filter((id) => id !== "slack" || state.connections.slack);
  const needsConnection = DESTINATIONS[draft.destinationId].requiresConnection && !state.connections[draft.destinationId];
  const nextRuns = upcomingRuns(draft, new Date(), 3);

  const save = () => {
    if (needsConnection) return;
    const now = new Date();
    saveSchedule({
      ...(existing ?? { id: uid("sch"), createdAt: now.toISOString(), active: true }),
      ...draft,
      name: draft.name.trim() || template.name,
      nextRunAt: computeNextRun(draft, now).toISOString(),
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={existing ? "Edit schedule" : "New automatic export"} description="Runs in the background whenever Spendwise is open, and catches up on missed runs." size="lg">
      <div className="space-y-5">
        <Field label="Name" htmlFor="schedule-name">
          <input id="schedule-name" data-autofocus value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Template" htmlFor="schedule-template">
            <select
              id="schedule-template"
              value={draft.templateId}
              onChange={(e) => {
                const id = e.target.value as TemplateId;
                setDraft((d) => ({ ...d, templateId: id, periodId: TEMPLATES[id].defaultPeriod }));
              }}
              className={`${inputClass} pr-8`}
            >
              {TEMPLATE_ORDER.map((id) => (
                <option key={id} value={id}>
                  {TEMPLATES[id].icon} {TEMPLATES[id].name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data period (relative to each run)" htmlFor="schedule-period">
            <select id="schedule-period" value={draft.periodId} onChange={(e) => set("periodId", e.target.value as PeriodId)} className={`${inputClass} pr-8`}>
              {template.periods.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-600">Destination</p>
          <div className="flex flex-wrap gap-1.5">
            {destinationOptions.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={draft.destinationId === id}
                onClick={() => set("destinationId", id)}
                className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-medium ring-1 ring-inset transition ${
                  draft.destinationId === id ? "bg-indigo-50 text-indigo-700 ring-indigo-500" : "text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <ServiceLogo id={id} className="h-5 w-5" />
                {DESTINATIONS[id].name}
              </button>
            ))}
          </div>
          {needsConnection && (
            <p className="mt-2 text-xs text-amber-700">
              {DESTINATIONS[draft.destinationId].name} isn&apos;t connected yet.{" "}
              <button type="button" onClick={() => onConnect(draft.destinationId)} className="font-semibold text-indigo-600 hover:text-indigo-500">
                Connect it now
              </button>
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
          <Field label="Repeat">
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Frequency">
              {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={draft.frequency === f}
                  onClick={() => set("frequency", f)}
                  className={`rounded-md px-3 py-1.5 transition ${draft.frequency === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {FREQUENCY_LABELS[f]}
                </button>
              ))}
            </div>
          </Field>
          {draft.frequency === "weekly" ? (
            <Field label="On" htmlFor="schedule-weekday">
              <select id="schedule-weekday" value={draft.weekday} onChange={(e) => set("weekday", Number(e.target.value))} className={`${inputClass} pr-8`}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          ) : draft.frequency === "monthly" ? (
            <Field label="Day of month" htmlFor="schedule-monthday">
              <select id="schedule-monthday" value={draft.monthDay} onChange={(e) => set("monthDay", Number(e.target.value))} className={`${inputClass} pr-8`}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div />
          )}
          <Field label="At" htmlFor="schedule-time">
            <input id="schedule-time" type="time" value={draft.time} onChange={(e) => e.target.value && set("time", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="Keep" htmlFor="schedule-retention" hint="Older copies are pruned at the destination automatically.">
          <select id="schedule-retention" value={draft.retention} onChange={(e) => set("retention", Number(e.target.value))} className={`${inputClass} pr-8 sm:w-56`}>
            {[3, 5, 8, 12, 30].map((n) => (
              <option key={n} value={n}>
                Last {n} exports
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-900">{describeTiming(draft)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Next runs:{" "}
            {nextRuns
              .map((d) => d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))
              .join("  ·  ")}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={needsConnection} className={buttonPrimary}>
            {existing ? "Save changes" : "Create schedule"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
