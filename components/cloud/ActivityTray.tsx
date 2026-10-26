"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { TEMPLATES } from "@/lib/cloud/templates";
import { formatBytes } from "@/lib/cloud/util";
import type { ExportJob } from "@/lib/cloud/types";
import { useCloud } from "./CloudProvider";
import { ServiceLogo } from "./ServiceLogo";

const AUTO_HIDE_MS = 7000;

/** Floating panel listing background export jobs, in the spirit of a cloud upload tray. */
export function ActivityTray() {
  const { state, retryJob, hydrated } = useCloud();
  // Jobs the user has already seen (restored from storage, or dismissed). Tracked by id rather than
  // timestamp so work enqueued in the same instant as hydration (e.g. schedule catch-up) still shows.
  const [hidden, setHidden] = useState<Set<string> | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const jobsRef = useRef(state.jobs);
  jobsRef.current = state.jobs;
  const hideAll = useCallback(() => setHidden(new Set(jobsRef.current.map((j) => j.id))), []);

  useEffect(() => {
    if (hydrated && hidden === null) hideAll();
  }, [hydrated, hidden, hideAll]);

  const jobs = useMemo(() => {
    if (!hidden) return [];
    // A failure that has since been retried (a newer run of the same export exists) no longer needs attention.
    const superseded = (j: ExportJob) =>
      j.status === "failed" &&
      state.jobs.some((o) => o.createdAt > j.createdAt && o.templateId === j.templateId && o.destinationId === j.destinationId);
    return state.jobs.filter((j) => !hidden.has(j.id) && !superseded(j)).slice(0, 6);
  }, [state.jobs, hidden]);
  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");
  const failed = jobs.filter((j) => j.status === "failed");

  // Tuck the tray away a few seconds after everything has finished successfully.
  useEffect(() => {
    if (jobs.length === 0 || active.length > 0 || failed.length > 0) return;
    const t = window.setTimeout(hideAll, AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [jobs.length, active.length, failed.length, hideAll]);

  if (jobs.length === 0) return null;

  const title = active.length
    ? `Processing ${active.length} export${active.length === 1 ? "" : "s"}…`
    : failed.length
      ? `${failed.length} export${failed.length === 1 ? "" : "s"} need attention`
      : `${jobs.length} export${jobs.length === 1 ? "" : "s"} complete`;

  return (
    <div
      className="fixed bottom-4 left-4 z-[55] w-[calc(100%-2rem)] max-w-sm animate-slide-up overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
      role="region"
      aria-label="Export activity"
    >
      <div className="flex items-center gap-2 bg-slate-900 px-4 py-2.5 text-white">
        {active.length > 0 ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
          </span>
        ) : (
          <span className={`h-2.5 w-2.5 rounded-full ${failed.length ? "bg-red-400" : "bg-emerald-400"}`} />
        )}
        <p className="flex-1 text-sm font-medium" aria-live="polite">
          {title}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? "Expand activity" : "Collapse activity"}
          aria-expanded={!collapsed}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          onClick={hideAll}
          className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
          aria-label="Dismiss activity"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
            {jobs.map((job) => {
              const dest = DESTINATIONS[job.destinationId];
              return (
                <li key={job.id} className="flex items-center gap-3 px-4 py-3">
                  <ServiceLogo id={job.destinationId} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {TEMPLATES[job.templateId].name} <span className="font-normal text-slate-400">→</span> {dest.name}
                    </p>
                    {job.status === "running" || job.status === "queued" ? (
                      <>
                        <p className="truncate text-xs text-slate-500">{job.stage}…</p>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-[width] duration-300"
                            style={{ width: `${Math.max(4, job.progress * 100)}%` }}
                          />
                        </div>
                      </>
                    ) : job.status === "failed" ? (
                      <p className="truncate text-xs text-red-600" title={job.error}>
                        {job.error}
                      </p>
                    ) : (
                      <p className="truncate text-xs text-slate-500">
                        {job.rowCount} records · {formatBytes(job.bytes ?? 0)}
                        {dest.simulated && " · simulated"}
                      </p>
                    )}
                  </div>
                  {job.status === "completed" && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-500" aria-label="Completed">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  )}
                  {job.status === "failed" && (
                    <button type="button" onClick={() => retryJob(job.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
                      Retry
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <Link href="/exports#history" className="block border-t border-slate-100 px-4 py-2 text-center text-xs font-semibold text-indigo-600 hover:bg-slate-50">
            View export history
          </Link>
        </>
      )}
    </div>
  );
}
