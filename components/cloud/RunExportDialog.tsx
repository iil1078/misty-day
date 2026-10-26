"use client";

import { useMemo, useState } from "react";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import { PERIOD_LABELS } from "@/lib/cloud/periods";
import { TEMPLATES, TEMPLATE_ORDER, buildArtifact } from "@/lib/cloud/templates";
import type { DestinationId, PeriodId, TemplateId } from "@/lib/cloud/types";
import { Modal } from "../Modal";
import { useExpenses } from "../ExpensesProvider";
import { buttonPrimary, buttonSecondary } from "../ui";
import { ArtifactPreview } from "./ArtifactPreview";
import { useCloud } from "./CloudProvider";
import { DemoBadge, Field, inputClass } from "./controls";
import { ServiceLogo } from "./ServiceLogo";

const DESTINATION_CHOICES: DestinationId[] = ["download", "email", "google-drive", "dropbox", "onedrive", "google-sheets", "notion", "slack"];

interface Props {
  initialTemplate: TemplateId;
  initialDestination?: DestinationId;
  onClose: () => void;
  onConnect: (id: DestinationId) => void;
  onEmail: (templateId: TemplateId, periodId: PeriodId) => void;
}

export function RunExportDialog({ initialTemplate, initialDestination = "download", onClose, onConnect, onEmail }: Props) {
  const { expenses } = useExpenses();
  const { state, runExport } = useCloud();
  const [templateId, setTemplateId] = useState(initialTemplate);
  const template = TEMPLATES[templateId];
  const [periodId, setPeriodId] = useState<PeriodId>(template.defaultPeriod);
  const [destinationId, setDestinationId] = useState<DestinationId>(initialDestination);

  const effectivePeriod = template.periods.includes(periodId) ? periodId : template.defaultPeriod;
  const artifact = useMemo(() => buildArtifact(templateId, effectivePeriod, expenses), [templateId, effectivePeriod, expenses]);
  const dest = DESTINATIONS[destinationId];
  const connected = (id: DestinationId) => !DESTINATIONS[id].requiresConnection || Boolean(state.connections[id]);

  const submit = () => {
    if (destinationId === "email") return onEmail(templateId, effectivePeriod);
    const conn = state.connections[destinationId];
    runExport({ templateId, periodId: effectivePeriod, destinationId, detail: conn?.folder });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Run an export" description="Generate a report and send it anywhere. It runs in the background." size="xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Template</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {TEMPLATE_ORDER.map((id) => {
                const t = TEMPLATES[id];
                const on = id === templateId;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setTemplateId(id);
                      setPeriodId(t.defaultPeriod);
                    }}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ring-1 ring-inset transition ${
                      on ? "bg-indigo-50 ring-indigo-500" : "ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span aria-hidden>{t.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{t.name}</span>
                    <span className="text-[11px] font-medium text-slate-400">{t.format}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Period" htmlFor="run-period">
            <select id="run-period" value={effectivePeriod} onChange={(e) => setPeriodId(e.target.value as PeriodId)} className={`${inputClass} pr-8`}>
              {template.periods.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Send to</p>
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Destination">
              {DESTINATION_CHOICES.map((id) => {
                const d = DESTINATIONS[id];
                const ok = connected(id);
                const on = id === destinationId;
                return ok ? (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDestinationId(id)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ring-1 ring-inset transition ${
                      on ? "bg-indigo-50 ring-indigo-500" : "ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <ServiceLogo id={id} className="h-6 w-6" />
                    <span className="truncate font-medium text-slate-900">{d.name}</span>
                  </button>
                ) : (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onConnect(id)}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <ServiceLogo id={id} className="h-6 w-6 opacity-50 grayscale" />
                    <span className="min-w-0 flex-1 truncate text-slate-500">{d.name}</span>
                    <span className="text-[11px] font-semibold text-indigo-600">Connect</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600">Output preview</p>
          <ArtifactPreview artifact={artifact} lines={14} />
          <p className="text-xs text-slate-500">{template.description}</p>
          {artifact.rowCount === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
              No expenses fall in this period — the file will only contain headers.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse items-stretch gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
        {dest.simulated && <DemoBadge className="mr-auto self-start sm:self-center" />}
        <button type="button" onClick={onClose} className={buttonSecondary}>
          Cancel
        </button>
        <button type="button" onClick={submit} className={buttonPrimary}>
          {destinationId === "email" ? "Continue to email →" : destinationId === "download" ? "Download" : `Send to ${dest.name}`}
        </button>
      </div>
    </Modal>
  );
}
