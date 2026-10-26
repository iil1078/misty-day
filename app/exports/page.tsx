"use client";

import { useCallback, useEffect, useState } from "react";
import { useCloud } from "@/components/cloud/CloudProvider";
import { ConnectDialog } from "@/components/cloud/ConnectDialog";
import { EmailComposer } from "@/components/cloud/EmailComposer";
import { HistoryPanel } from "@/components/cloud/HistoryPanel";
import { IntegrationsPanel } from "@/components/cloud/IntegrationsPanel";
import { OverviewPanel } from "@/components/cloud/OverviewPanel";
import { RunExportDialog } from "@/components/cloud/RunExportDialog";
import { ScheduleDialog, type ScheduleDraft } from "@/components/cloud/ScheduleDialog";
import { SchedulesPanel } from "@/components/cloud/SchedulesPanel";
import { SharePanel } from "@/components/cloud/SharePanel";
import { SheetsWizard } from "@/components/cloud/SheetsWizard";
import { HUB_TABS, isHubTab, type HubTab } from "@/components/cloud/tabs";
import { useExpenses } from "@/components/ExpensesProvider";
import { PageLoading } from "@/components/ui";
import type { DestinationId, PeriodId, Schedule, TemplateId } from "@/lib/cloud/types";

type DialogState =
  | { kind: "none" }
  | { kind: "run"; templateId: TemplateId }
  | { kind: "email"; templateId: TemplateId; periodId?: PeriodId }
  | { kind: "sheets" }
  | { kind: "connect"; id: DestinationId }
  | { kind: "schedule"; existing?: Schedule; preset?: ScheduleDraft };

export default function ExportHubPage() {
  const { isLoading } = useExpenses();
  const { state, hydrated } = useCloud();
  const [tab, setTabState] = useState<HubTab>("overview");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  // The tab lives in the URL hash so links like /exports#history deep-link correctly.
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      setTabState(isHubTab(hash) ? hash : "overview");
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const setTab = useCallback((next: HubTab) => {
    setTabState(next);
    window.history.replaceState(null, "", next === "overview" ? window.location.pathname : `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const close = useCallback(() => setDialog({ kind: "none" }), []);
  const openEmail = useCallback((templateId: TemplateId, periodId?: PeriodId) => setDialog({ kind: "email", templateId, periodId }), []);
  const openSheets = useCallback(() => setDialog({ kind: "sheets" }), []);
  const openConnect = useCallback((id: DestinationId) => setDialog(id === "google-sheets" ? { kind: "sheets" } : { kind: "connect", id }), []);
  const openSchedule = useCallback((preset?: ScheduleDraft) => setDialog({ kind: "schedule", preset }), []);
  const openRun = useCallback((templateId: TemplateId) => setDialog({ kind: "run", templateId }), []);

  if (isLoading || !hydrated) return <PageLoading />;

  const counts: Partial<Record<HubTab, number>> = {
    integrations: Object.keys(state.connections).length,
    schedules: state.schedules.length,
    share: state.shares.length,
    history: state.jobs.length,
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Share & Export</h1>
        <p className="text-sm text-slate-500">Reports, integrations, automations and shareable snapshots.</p>
      </div>

      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/90 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <nav className="-mb-px flex gap-6 overflow-x-auto" role="tablist" aria-label="Share & Export sections">
          {HUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 py-3 text-sm font-medium transition ${
                tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {t.label}
              {counts[t.id] ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${tab === t.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-200/70 text-slate-600"}`}>
                  {counts[t.id]}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && <OverviewPanel onRun={openRun} onEmail={openEmail} onSheets={openSheets} onSchedule={openSchedule} onTab={setTab} />}
        {tab === "integrations" && <IntegrationsPanel onConnect={openConnect} onEmail={() => openEmail("monthly-summary")} onSheets={openSheets} />}
        {tab === "schedules" && <SchedulesPanel onCreate={openSchedule} onEdit={(s) => setDialog({ kind: "schedule", existing: s })} />}
        {tab === "share" && <SharePanel />}
        {tab === "history" && <HistoryPanel />}
      </div>

      {dialog.kind === "run" && <RunExportDialog initialTemplate={dialog.templateId} onClose={close} onConnect={openConnect} onEmail={openEmail} />}
      {dialog.kind === "email" && <EmailComposer initialTemplate={dialog.templateId} initialPeriod={dialog.periodId} onClose={close} />}
      {dialog.kind === "sheets" && <SheetsWizard onClose={close} />}
      {dialog.kind === "connect" && <ConnectDialog id={dialog.id} onClose={close} />}
      {dialog.kind === "schedule" && <ScheduleDialog existing={dialog.existing} preset={dialog.preset} onClose={close} onConnect={openConnect} />}
    </>
  );
}
