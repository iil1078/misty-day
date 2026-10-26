"use client";

import { useMemo, useState } from "react";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { PERIOD_LABELS } from "@/lib/cloud/periods";
import { TEMPLATES, buildArtifact } from "@/lib/cloud/templates";
import type { DestinationId, ExportJob, JobStatus } from "@/lib/cloud/types";
import { downloadText, formatBytes, formatDateTime, relativeTime } from "@/lib/cloud/util";
import { useExpenses } from "../ExpensesProvider";
import { useToast } from "../ToastProvider";
import { buttonSecondary } from "../ui";
import { useCloud, useNow } from "./CloudProvider";
import { StatusChip, inputClass } from "./controls";
import { ServiceLogo } from "./ServiceLogo";

const TRIGGER_LABELS = { manual: "Manual", schedule: "Scheduled", "auto-sync": "Auto-sync" } as const;

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function HistoryPanel() {
  const { state, retryJob, clearHistory } = useCloud();
  const { expenses } = useExpenses();
  const { toast } = useToast();
  const now = useNow();
  const [destination, setDestination] = useState<DestinationId | "all">("all");
  const [status, setStatus] = useState<JobStatus | "all">("all");

  const jobs = state.jobs.filter((j) => (destination === "all" || j.destinationId === destination) && (status === "all" || j.status === status));
  const groups = useMemo(() => {
    const map = new Map<string, ExportJob[]>();
    for (const j of jobs) map.set(dayLabel(j.createdAt), [...(map.get(dayLabel(j.createdAt)) ?? []), j]);
    return [...map.entries()];
  }, [jobs]);

  const stats = useMemo(() => {
    const done = state.jobs.filter((j) => j.status === "completed");
    const finished = state.jobs.filter((j) => j.status === "completed" || j.status === "failed").length;
    return {
      total: state.jobs.length,
      success: finished ? Math.round((done.length / finished) * 100) : null,
      bytes: done.reduce((acc, j) => acc + (j.bytes ?? 0), 0),
      rows: done.reduce((acc, j) => acc + (j.rowCount ?? 0), 0),
    };
  }, [state.jobs]);

  const redownload = (job: ExportJob) => {
    const artifact = buildArtifact(job.templateId, job.periodId, expenses);
    downloadText(artifact.content, artifact.filename, artifact.mimeType);
    toast(`Downloaded a fresh copy of ${artifact.filename}`);
  };

  const copyChecksum = async (checksum: string) => {
    try {
      await navigator.clipboard.writeText(checksum);
      toast("SHA-256 checksum copied");
    } catch {
      toast("Clipboard access was blocked by the browser.", { variant: "error" });
    }
  };

  const usedDestinations = [...new Set(state.jobs.map((j) => j.destinationId))];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Exports run", stats.total.toLocaleString()],
          ["Success rate", stats.success === null ? "—" : `${stats.success}%`],
          ["Records delivered", stats.rows.toLocaleString()],
          ["Data generated", formatBytes(stats.bytes)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="history-destination" className="mb-1 block text-xs font-medium text-slate-600">
            Destination
          </label>
          <select id="history-destination" value={destination} onChange={(e) => setDestination(e.target.value as DestinationId | "all")} className={`${inputClass} pr-8`}>
            <option value="all">All destinations</option>
            {usedDestinations.map((id) => (
              <option key={id} value={id}>
                {DESTINATIONS[id].name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="history-status" className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <select id="history-status" value={status} onChange={(e) => setStatus(e.target.value as JobStatus | "all")} className={`${inputClass} pr-8`}>
            <option value="all">Any status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">In progress</option>
          </select>
        </div>
        {state.jobs.length > 0 && (
          <button type="button" onClick={clearHistory} className={`${buttonSecondary} ml-auto`}>
            Clear history
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200/70">
          <p className="text-3xl" aria-hidden>
            🗂️
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">{state.jobs.length ? "No exports match these filters" : "No exports yet"}</p>
          <p className="mt-1 text-sm text-slate-500">Every export — manual, scheduled, or auto-synced — is logged here with a checksum.</p>
        </div>
      ) : (
        groups.map(([day, items]) => (
          <section key={day}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{day}</h3>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
              {items.map((job) => {
                const template = TEMPLATES[job.templateId];
                const dest = DESTINATIONS[job.destinationId];
                return (
                  <li key={job.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                    <ServiceLogo id={job.destinationId} className="h-9 w-9" />
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {template.icon} {template.name} <span className="font-normal text-slate-400">·</span>{" "}
                        <span className="font-normal text-slate-500">{PERIOD_LABELS[job.periodId]}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {dest.name}
                        {job.detail && ` · ${job.detail}`} ·{" "}
                        <time dateTime={job.createdAt} title={formatDateTime(job.createdAt)}>
                          {relativeTime(job.createdAt, now)}
                        </time>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <StatusChip tone="slate">{TRIGGER_LABELS[job.trigger]}</StatusChip>
                      {job.status === "completed" ? (
                        job.pruned ? (
                          <StatusChip tone="slate">Pruned by retention</StatusChip>
                        ) : (
                          <StatusChip tone="green">Delivered{dest.simulated && " (simulated)"}</StatusChip>
                        )
                      ) : job.status === "failed" ? (
                        <StatusChip tone="red">Failed</StatusChip>
                      ) : (
                        <StatusChip tone="blue">{job.stage}…</StatusChip>
                      )}
                    </div>
                    <div className="w-28 text-right text-xs tabular-nums text-slate-500">
                      {job.status === "completed" ? (
                        <>
                          <p>{job.rowCount?.toLocaleString()} records</p>
                          <p>{formatBytes(job.bytes ?? 0)}</p>
                        </>
                      ) : job.status === "failed" ? (
                        <p className="text-red-600" title={job.error}>
                          {job.error}
                        </p>
                      ) : (
                        <p>{Math.round(job.progress * 100)}%</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {job.checksum && (
                        <button
                          type="button"
                          onClick={() => copyChecksum(job.checksum!)}
                          title={`SHA-256 ${job.checksum} — click to copy`}
                          className="rounded-md px-2 py-1 font-mono text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          #{job.checksum.slice(0, 8)}
                        </button>
                      )}
                      {job.status === "failed" ? (
                        <button type="button" onClick={() => retryJob(job.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
                          Retry
                        </button>
                      ) : (
                        job.status === "completed" && (
                          <button
                            type="button"
                            onClick={() => redownload(job)}
                            title="Regenerates this report from your current data"
                            className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                          >
                            Download
                          </button>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
