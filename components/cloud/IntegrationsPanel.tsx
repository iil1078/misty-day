"use client";

import { DESTINATIONS, INTEGRATION_GROUPS } from "@/lib/cloud/destinations";
import { TEMPLATES } from "@/lib/cloud/templates";
import type { DestinationId } from "@/lib/cloud/types";
import { relativeTime } from "@/lib/cloud/util";
import { buttonPrimary, buttonSecondary } from "../ui";
import { useCloud, useNow } from "./CloudProvider";
import { DemoBadge, StatusChip, Toggle } from "./controls";
import { ServiceLogo } from "./ServiceLogo";

export function IntegrationsPanel({ onConnect, onEmail, onSheets }: { onConnect: (id: DestinationId) => void; onEmail: () => void; onSheets: () => void }) {
  const { state, disconnect, updateConnection, runExport } = useCloud();
  const now = useNow();
  const busy = new Set(state.jobs.filter((j) => j.status === "running" || j.status === "queued").map((j) => j.destinationId));

  const syncNow = (id: DestinationId) => {
    const conn = state.connections[id]!;
    const template = TEMPLATES[conn.autoSyncTemplate];
    runExport({ templateId: template.id, periodId: template.periods.includes("all") ? "all" : template.defaultPeriod, destinationId: id, detail: conn.folder });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3 rounded-xl bg-amber-50/60 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <DemoBadge className="mt-0.5" />
        <p>
          Integrations are interactive prototypes: sign-in, sync, and delivery are simulated and no data leaves your device. Files are still generated for real — use{" "}
          <span className="font-medium">This device</span>, <span className="font-medium">Copy for Sheets</span>, or <span className="font-medium">snapshot links</span> to actually move data.
        </p>
      </div>

      {INTEGRATION_GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{group.title}</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.ids.map((id) => {
              const dest = DESTINATIONS[id];
              const conn = state.connections[id];
              const syncing = busy.has(id);
              const lastJob = state.jobs.find((j) => j.destinationId === id && j.status !== "queued" && j.status !== "running");
              return (
                <article key={id} className={`flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 transition ${conn ? "ring-emerald-200" : "ring-slate-200/70 hover:ring-slate-300"}`}>
                  <div className="flex items-start gap-3">
                    <ServiceLogo id={id} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-900">{dest.name}</h4>
                      <div className="mt-1">
                        {id === "email" ? (
                          <StatusChip tone="slate">No setup needed</StatusChip>
                        ) : syncing ? (
                          <StatusChip tone="blue">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" /> Syncing
                          </StatusChip>
                        ) : conn && lastJob?.status === "failed" ? (
                          <StatusChip tone="red">Needs attention</StatusChip>
                        ) : conn ? (
                          <StatusChip tone="green">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                          </StatusChip>
                        ) : (
                          <StatusChip tone="slate">Not connected</StatusChip>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-slate-500">{dest.description}</p>

                  {conn && (
                    <dl className="mt-4 space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Account</dt>
                        <dd className="truncate font-medium text-slate-800">{conn.account}</dd>
                      </div>
                      {conn.folder && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">{id === "slack" ? "Channel" : id === "google-sheets" ? "Spreadsheet" : "Location"}</dt>
                          <dd className="truncate font-mono text-slate-800">{conn.folder}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Last sync</dt>
                        <dd className="text-slate-800">{conn.lastSyncAt ? relativeTime(conn.lastSyncAt, now) : "Never"}</dd>
                      </div>
                    </dl>
                  )}

                  {conn && dest.supportsAutoSync && (
                    <div className="mt-4">
                      <Toggle
                        checked={conn.autoSync}
                        onChange={(v) => updateConnection(id, { autoSync: v })}
                        label="Auto-sync"
                        description={`Pushes ${TEMPLATES[conn.autoSyncTemplate].name.toLowerCase()} on every change`}
                      />
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {id === "email" ? (
                      <button type="button" onClick={onEmail} className={buttonPrimary}>
                        Compose
                      </button>
                    ) : conn ? (
                      <>
                        <button type="button" onClick={() => syncNow(id)} disabled={syncing} className={buttonSecondary}>
                          {syncing ? "Syncing…" : id === "slack" ? "Post now" : "Sync now"}
                        </button>
                        <button type="button" onClick={() => disconnect(id)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600">
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => (id === "google-sheets" ? onSheets() : onConnect(id))} className={buttonPrimary}>
                        Connect
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
