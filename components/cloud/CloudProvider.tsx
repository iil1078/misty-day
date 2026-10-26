"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Expense } from "@/lib/types";
import { DESTINATIONS, jobStages } from "@/lib/cloud/destinations";
import { computeNextRun } from "@/lib/cloud/schedule";
import { TEMPLATES, buildArtifact } from "@/lib/cloud/templates";
import { byteLength, downloadText, sha256Hex, sleep, uid } from "@/lib/cloud/util";
import type {
  CloudState,
  Connection,
  DestinationId,
  ExportJob,
  JobTrigger,
  PeriodId,
  Schedule,
  ShareLink,
  TemplateId,
} from "@/lib/cloud/types";
import { useExpenses } from "../ExpensesProvider";
import { useToast } from "../ToastProvider";

// Outside the "expense-tracker:" prefix so cross-tab expense sync ignores it.
const STORAGE_KEY = "spendwise:cloud:v1";
const MAX_JOBS = 60;
const CONCURRENCY = 2;
const AUTO_SYNC_DEBOUNCE_MS = 2500;

const EMPTY: CloudState = { connections: {}, jobs: [], schedules: [], shares: [] };

export interface ExportRequest {
  templateId: TemplateId;
  periodId: PeriodId;
  destinationId: DestinationId;
  trigger?: JobTrigger;
  detail?: string;
  scheduleId?: string;
}

export type SyncStatus =
  | { kind: "local" }
  | { kind: "syncing"; count: number }
  | { kind: "error"; message: string }
  | { kind: "synced"; lastSyncAt?: string };

type Action =
  | { type: "hydrate"; state: CloudState }
  | { type: "connect"; connection: Connection }
  | { type: "disconnect"; id: DestinationId }
  | { type: "update-connection"; id: DestinationId; patch: Partial<Connection> }
  | { type: "enqueue"; job: ExportJob }
  | { type: "update-job"; id: string; patch: Partial<ExportJob> }
  | { type: "complete-job"; id: string; patch: Partial<ExportJob> }
  | { type: "clear-history" }
  | { type: "save-schedule"; schedule: Schedule }
  | { type: "delete-schedule"; id: string }
  | { type: "add-share"; share: ShareLink }
  | { type: "delete-share"; id: string };

function reducer(state: CloudState, action: Action): CloudState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "connect":
      return { ...state, connections: { ...state.connections, [action.connection.destinationId]: action.connection } };
    case "disconnect": {
      const connections = { ...state.connections };
      delete connections[action.id];
      return { ...state, connections };
    }
    case "update-connection": {
      const current = state.connections[action.id];
      if (!current) return state;
      return { ...state, connections: { ...state.connections, [action.id]: { ...current, ...action.patch } } };
    }
    case "enqueue":
      return { ...state, jobs: [action.job, ...state.jobs].slice(0, MAX_JOBS) };
    case "update-job":
      return { ...state, jobs: state.jobs.map((j) => (j.id === action.id ? { ...j, ...action.patch } : j)) };
    case "complete-job": {
      let jobs = state.jobs.map((j) => (j.id === action.id ? { ...j, ...action.patch } : j));
      const job = jobs.find((j) => j.id === action.id)!;
      // Apply the schedule's retention policy: older successful runs are pruned at the destination.
      const schedule = job.scheduleId ? state.schedules.find((s) => s.id === job.scheduleId) : undefined;
      if (schedule) {
        const keep = new Set(
          jobs.filter((j) => j.scheduleId === schedule.id && j.status === "completed").slice(0, schedule.retention).map((j) => j.id),
        );
        jobs = jobs.map((j) => (j.scheduleId === schedule.id && j.status === "completed" && !keep.has(j.id) ? { ...j, pruned: true } : j));
      }
      const conn = state.connections[job.destinationId];
      return {
        ...state,
        jobs,
        connections: conn
          ? { ...state.connections, [job.destinationId]: { ...conn, lastSyncAt: action.patch.finishedAt } }
          : state.connections,
      };
    }
    case "clear-history":
      return { ...state, jobs: state.jobs.filter((j) => j.status === "queued" || j.status === "running") };
    case "save-schedule": {
      const exists = state.schedules.some((s) => s.id === action.schedule.id);
      return {
        ...state,
        schedules: exists
          ? state.schedules.map((s) => (s.id === action.schedule.id ? action.schedule : s))
          : [...state.schedules, action.schedule],
      };
    }
    case "delete-schedule":
      return { ...state, schedules: state.schedules.filter((s) => s.id !== action.id) };
    case "add-share":
      return { ...state, shares: [action.share, ...state.shares] };
    case "delete-share":
      return { ...state, shares: state.shares.filter((s) => s.id !== action.id) };
  }
}

function load(): CloudState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CloudState>;
    const now = new Date().toISOString();
    return {
      connections: parsed.connections ?? {},
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      shares: Array.isArray(parsed.shares) ? parsed.shares : [],
      // Work in flight when the tab closed can't resume; surface it honestly so it can be retried.
      jobs: (Array.isArray(parsed.jobs) ? parsed.jobs : []).map((j) =>
        j.status === "queued" || j.status === "running"
          ? { ...j, status: "failed" as const, stage: "Failed", error: "Interrupted — Spendwise was closed before this finished.", finishedAt: now }
          : j,
      ),
    };
  } catch {
    return EMPTY;
  }
}

interface CloudContextValue {
  state: CloudState;
  hydrated: boolean;
  syncStatus: SyncStatus;
  runExport: (request: ExportRequest) => string;
  retryJob: (id: string) => void;
  clearHistory: () => void;
  connect: (id: DestinationId, account: string, opts?: { folder?: string; autoSync?: boolean }) => void;
  disconnect: (id: DestinationId) => void;
  updateConnection: (id: DestinationId, patch: Partial<Connection>) => void;
  saveSchedule: (schedule: Schedule) => void;
  deleteSchedule: (id: string) => void;
  addShare: (share: ShareLink) => void;
  deleteShare: (id: string) => void;
}

const CloudContext = createContext<CloudContextValue | null>(null);

export function CloudProvider({ children }: { children: React.ReactNode }) {
  const { expenses, isLoading } = useExpenses();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [hydrated, setHydrated] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const expensesRef = useRef<Expense[]>(expenses);
  expensesRef.current = expenses;

  useEffect(() => {
    dispatch({ type: "hydrate", state: load() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or disabled — cloud settings just won't persist */
    }
  }, [state, hydrated]);

  const runExport = useCallback((request: ExportRequest) => {
    const template = TEMPLATES[request.templateId];
    const job: ExportJob = {
      id: uid("job"),
      templateId: request.templateId,
      periodId: template.periods.includes(request.periodId) ? request.periodId : template.defaultPeriod,
      destinationId: request.destinationId,
      trigger: request.trigger ?? "manual",
      status: "queued",
      stage: "Queued",
      progress: 0,
      createdAt: new Date().toISOString(),
      detail: request.detail,
      scheduleId: request.scheduleId,
    };
    dispatch({ type: "enqueue", job });
    return job.id;
  }, []);

  // ---- Job runner: real file generation, simulated delivery for third-party services ----
  const execute = useCallback(
    async (job: ExportJob) => {
      const template = TEMPLATES[job.templateId];
      const dest = DESTINATIONS[job.destinationId];
      const stages = jobStages(dest, template.format);
      const set = (patch: Partial<ExportJob>) => dispatch({ type: "update-job", id: job.id, patch });
      try {
        set({ status: "running", stage: stages[0], progress: 0.08 });
        await sleep(450);
        if (dest.requiresConnection && !stateRef.current.connections[dest.id]) {
          throw new Error(`${dest.name} isn't connected.`);
        }
        if (dest.simulated && !navigator.onLine) throw new Error(`You're offline — couldn't reach ${dest.name}.`);

        set({ stage: stages[1], progress: 0.25 });
        const artifact = buildArtifact(job.templateId, job.periodId, expensesRef.current);
        const bytes = byteLength(artifact.content);
        await sleep(500);

        set({ stage: stages[2], progress: 0.45 });
        const checksum = await sha256Hex(artifact.content);
        await sleep(300);

        set({ stage: stages[3], progress: 0.55 });
        if (dest.id === "download") {
          downloadText(artifact.content, artifact.filename, artifact.mimeType);
          await sleep(300);
        } else {
          const perStep = Math.min(420, 140 + bytes / 300);
          for (let i = 1; i <= 6; i++) {
            await sleep(perStep);
            set({ progress: 0.55 + 0.35 * (i / 6) });
          }
        }
        set({ stage: stages[4], progress: 0.96 });
        await sleep(250);
        dispatch({
          type: "complete-job",
          id: job.id,
          patch: {
            status: "completed",
            stage: "Done",
            progress: 1,
            finishedAt: new Date().toISOString(),
            rowCount: artifact.rowCount,
            bytes,
            filename: artifact.filename,
            checksum,
          },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong.";
        set({ status: "failed", stage: "Failed", error: message, finishedAt: new Date().toISOString() });
        toast(`${template.name} → ${dest.name} failed: ${message}`, {
          variant: "error",
          action: { label: "Retry", onClick: () => retryRef.current(job.id) },
        });
      }
    },
    [toast],
  );

  const started = useRef(new Set<string>());
  useEffect(() => {
    if (!hydrated) return;
    const running = state.jobs.filter((j) => j.status === "running").length;
    const waiting = state.jobs.filter((j) => j.status === "queued" && !started.current.has(j.id)).reverse(); // oldest first
    for (const job of waiting.slice(0, Math.max(0, CONCURRENCY - running))) {
      started.current.add(job.id);
      void execute(job);
    }
  }, [state.jobs, hydrated, execute]);

  const retryJob = useCallback(
    (id: string) => {
      const job = stateRef.current.jobs.find((j) => j.id === id);
      if (job) runExport({ ...job, trigger: job.trigger });
    },
    [runExport],
  );
  const retryRef = useRef(retryJob);
  retryRef.current = retryJob;

  // ---- Scheduler: fires due schedules while the app is open, and catches up on load ----
  const fired = useRef(new Set<string>());
  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const now = new Date();
      for (const s of stateRef.current.schedules) {
        const key = `${s.id}@${s.nextRunAt}`;
        if (!s.active || new Date(s.nextRunAt) > now || fired.current.has(key)) continue;
        fired.current.add(key);
        dispatch({
          type: "save-schedule",
          schedule: { ...s, lastRunAt: now.toISOString(), nextRunAt: computeNextRun(s, now).toISOString() },
        });
        runExport({ templateId: s.templateId, periodId: s.periodId, destinationId: s.destinationId, trigger: "schedule", scheduleId: s.id, detail: s.name });
      }
    };
    tick();
    const timer = window.setInterval(tick, 15_000);
    return () => window.clearInterval(timer);
  }, [hydrated, runExport]);

  // ---- Auto-sync: push to live-sync connections shortly after expenses change ----
  const syncedExpenses = useRef<Expense[] | null>(null);
  useEffect(() => {
    if (isLoading || !hydrated) return;
    if (syncedExpenses.current === null) {
      syncedExpenses.current = expenses;
      return;
    }
    if (syncedExpenses.current === expenses) return;
    const timer = window.setTimeout(() => {
      syncedExpenses.current = expenses;
      for (const conn of Object.values(stateRef.current.connections)) {
        if (!conn?.autoSync) continue;
        const alreadyQueued = stateRef.current.jobs.some(
          (j) => j.destinationId === conn.destinationId && j.trigger === "auto-sync" && j.status === "queued",
        );
        if (alreadyQueued) continue;
        const template = TEMPLATES[conn.autoSyncTemplate];
        runExport({
          templateId: conn.autoSyncTemplate,
          periodId: template.periods.includes("all") ? "all" : template.defaultPeriod,
          destinationId: conn.destinationId,
          trigger: "auto-sync",
          detail: "Changes detected",
        });
      }
    }, AUTO_SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [expenses, isLoading, hydrated, runExport]);

  const syncStatus = useMemo<SyncStatus>(() => {
    const connected = Object.values(state.connections).filter(Boolean) as Connection[];
    const active = state.jobs.filter((j) => (j.status === "running" || j.status === "queued") && j.destinationId !== "download");
    if (active.length) return { kind: "syncing", count: active.length };
    if (!connected.length) return { kind: "local" };
    for (const conn of connected) {
      const latest = state.jobs.find((j) => j.destinationId === conn.destinationId && j.status !== "queued");
      if (latest?.status === "failed") return { kind: "error", message: `${DESTINATIONS[conn.destinationId].name}: ${latest.error}` };
    }
    const lastSyncAt = connected.map((c) => c.lastSyncAt).filter(Boolean).sort().at(-1);
    return { kind: "synced", lastSyncAt };
  }, [state.connections, state.jobs]);

  const value = useMemo<CloudContextValue>(
    () => ({
      state,
      hydrated,
      syncStatus,
      runExport,
      retryJob,
      clearHistory: () => dispatch({ type: "clear-history" }),
      connect: (id, account, opts = {}) =>
        dispatch({
          type: "connect",
          connection: {
            destinationId: id,
            account,
            connectedAt: new Date().toISOString(),
            folder: opts.folder ?? DESTINATIONS[id].defaultFolder,
            autoSync: opts.autoSync ?? false,
            autoSyncTemplate: DESTINATIONS[id].defaultAutoSyncTemplate,
          },
        }),
      disconnect: (id) => dispatch({ type: "disconnect", id }),
      updateConnection: (id, patch) => dispatch({ type: "update-connection", id, patch }),
      saveSchedule: (schedule) => dispatch({ type: "save-schedule", schedule }),
      deleteSchedule: (id) => dispatch({ type: "delete-schedule", id }),
      addShare: (share) => dispatch({ type: "add-share", share }),
      deleteShare: (id) => dispatch({ type: "delete-share", id }),
    }),
    [state, hydrated, syncStatus, runExport, retryJob],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error("useCloud must be used within CloudProvider");
  return ctx;
}

/** Re-renders on an interval so relative timestamps ("2 min ago") stay fresh. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
