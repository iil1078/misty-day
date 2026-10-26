"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { relativeTime } from "@/lib/cloud/util";
import type { Connection } from "@/lib/cloud/types";
import { useCloud, useNow } from "./CloudProvider";
import { ServiceLogo } from "./ServiceLogo";

/** Header pill summarising cloud sync health, with a popover of connected services. */
export function SyncStatus() {
  const { syncStatus, state, hydrated } = useCloud();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hydrated) return null;

  const connections = Object.values(state.connections).filter(Boolean) as Connection[];
  const busy = new Set(state.jobs.filter((j) => j.status === "running" || j.status === "queued").map((j) => j.destinationId));

  const { dot, label } =
    syncStatus.kind === "syncing"
      ? { dot: "bg-sky-500 animate-pulse", label: "Syncing…" }
      : syncStatus.kind === "error"
        ? { dot: "bg-red-500", label: "Sync issue" }
        : syncStatus.kind === "synced"
          ? { dot: "bg-emerald-500", label: syncStatus.lastSyncAt ? `Synced ${relativeTime(syncStatus.lastSyncAt, now)}` : "Connected" }
          : { dot: "bg-slate-300", label: "Local only" };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400" aria-hidden>
          <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
        </svg>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        <span className="hidden md:inline">{label}</span>
        <span className="sr-only md:hidden">{label}</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Sync status" className="absolute right-0 top-full z-50 mt-2 w-80 animate-slide-up rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-900/10">
          <div className="px-3 pb-2 pt-2">
            <p className="text-sm font-semibold text-slate-900">Connected services</p>
            <p className="text-xs text-slate-500">
              {syncStatus.kind === "error" ? syncStatus.message : "Your data stays on this device until you send it somewhere."}
            </p>
          </div>
          {connections.length === 0 ? (
            <p className="mx-1 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">No services connected yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {connections.map((c) => (
                <li key={c.destinationId} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
                  <ServiceLogo id={c.destinationId} className="h-7 w-7" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{DESTINATIONS[c.destinationId].name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {busy.has(c.destinationId)
                        ? "Syncing now…"
                        : c.lastSyncAt
                          ? `Last sync ${relativeTime(c.lastSyncAt, now)}`
                          : "Never synced"}
                      {c.autoSync && " · Auto"}
                    </p>
                  </div>
                  {busy.has(c.destinationId) && (
                    <svg className="h-4 w-4 animate-spin text-sky-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/exports#integrations"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl px-3 py-2 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Manage integrations →
          </Link>
        </div>
      )}
    </div>
  );
}
