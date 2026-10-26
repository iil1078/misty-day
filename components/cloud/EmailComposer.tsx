"use client";

import { useMemo, useState } from "react";
import { PERIOD_LABELS, inPeriod, resolvePeriod } from "@/lib/cloud/periods";
import { TEMPLATES, TEMPLATE_ORDER, buildArtifact } from "@/lib/cloud/templates";
import type { PeriodId, TemplateId } from "@/lib/cloud/types";
import { byteLength, formatBytes } from "@/lib/cloud/util";
import { sum } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { Modal } from "../Modal";
import { useExpenses } from "../ExpensesProvider";
import { buttonPrimary, buttonSecondary } from "../ui";
import { useCloud } from "./CloudProvider";
import { DemoBadge, Field, inputClass } from "./controls";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAILTO_BODY_LIMIT = 1800;

export function EmailComposer({
  initialTemplate,
  initialPeriod,
  onClose,
}: {
  initialTemplate: TemplateId;
  initialPeriod?: PeriodId;
  onClose: () => void;
}) {
  const { expenses } = useExpenses();
  const { runExport } = useCloud();
  const [templateId, setTemplateId] = useState(initialTemplate);
  const template = TEMPLATES[templateId];
  const [periodId, setPeriodId] = useState<PeriodId>(initialPeriod ?? template.defaultPeriod);
  const effectivePeriod = template.periods.includes(periodId) ? periodId : template.defaultPeriod;
  const period = resolvePeriod(effectivePeriod);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [subjectEdited, setSubjectEdited] = useState<string | null>(null);
  const [message, setMessage] = useState("Hi,\n\nPlease find my expense report attached.\n\nThanks!");

  const subject = subjectEdited ?? `${template.name} — ${period.label}`;
  const artifact = useMemo(() => buildArtifact(templateId, effectivePeriod, expenses), [templateId, effectivePeriod, expenses]);
  const scoped = useMemo(() => inPeriod(expenses, resolvePeriod(effectivePeriod)), [expenses, effectivePeriod]);

  const commitDraft = () => {
    const parts = draft.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return true;
    const bad = parts.find((p) => !EMAIL_RE.test(p));
    if (bad) {
      setDraftError(`“${bad}” isn't a valid email address.`);
      return false;
    }
    setRecipients((r) => [...r, ...parts.filter((p) => !r.includes(p))]);
    setDraft("");
    setDraftError(null);
    return true;
  };

  const send = () => {
    if (!commitDraft()) return;
    // State updates from commitDraft land next render, so merge the draft here too.
    const to = [...new Set([...recipients, ...draft.split(/[,;\s]+/).filter((p) => EMAIL_RE.test(p))])];
    if (to.length === 0) {
      setDraftError("Add at least one recipient.");
      return;
    }
    runExport({
      templateId,
      periodId: effectivePeriod,
      destinationId: "email",
      detail: `to ${to[0]}${to.length > 1 ? ` +${to.length - 1}` : ""}`,
    });
    onClose();
  };

  // Real fallback: hand the report to the user's own mail client (text only; mailto can't attach files).
  const mailto = () => {
    const body = template.format === "Markdown" ? `${message}\n\n${artifact.content}` : `${message}\n\n(Exported from Spendwise — attach ${artifact.filename})`;
    const href = `mailto:${recipients.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      body.length > MAILTO_BODY_LIMIT ? body.slice(0, MAILTO_BODY_LIMIT) + "\n…" : body,
    )}`;
    window.location.href = href;
  };

  return (
    <Modal open onClose={onClose} title="Email a report" description="Send a polished report with the file attached." size="xl">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="To" htmlFor="email-to" hint={draftError ? <span className="text-red-600">{draftError}</span> : "Press Enter or comma to add each address."}>
            <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-indigo-600">
              {recipients.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-indigo-700">
                  {r}
                  <button
                    type="button"
                    onClick={() => setRecipients((list) => list.filter((x) => x !== r))}
                    className="rounded-full p-0.5 hover:bg-indigo-100"
                    aria-label={`Remove ${r}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                id="email-to"
                type="email"
                data-autofocus
                value={draft}
                placeholder={recipients.length ? "" : "accountant@example.com"}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setDraftError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitDraft();
                  } else if (e.key === "Backspace" && !draft && recipients.length) {
                    setRecipients((r) => r.slice(0, -1));
                  }
                }}
                onBlur={() => draft && commitDraft()}
                className="min-w-[10rem] flex-1 border-0 bg-transparent p-1 text-sm focus:outline-none focus:ring-0"
              />
            </div>
          </Field>
          <Field label="Subject" htmlFor="email-subject">
            <input id="email-subject" value={subject} onChange={(e) => setSubjectEdited(e.target.value)} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Report" htmlFor="email-template">
              <select
                id="email-template"
                value={templateId}
                onChange={(e) => {
                  const id = e.target.value as TemplateId;
                  setTemplateId(id);
                  setPeriodId(TEMPLATES[id].defaultPeriod);
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
            <Field label="Period" htmlFor="email-period">
              <select id="email-period" value={effectivePeriod} onChange={(e) => setPeriodId(e.target.value as PeriodId)} className={`${inputClass} pr-8`}>
                {template.periods.map((p) => (
                  <option key={p} value={p}>
                    {PERIOD_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Message" htmlFor="email-message">
            <textarea id="email-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} resize-none`} />
          </Field>
        </div>

        {/* Live rendering of what the recipient will see. */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-600">Recipient preview</p>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="space-y-1 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
              <p>
                <span className="inline-block w-14">From</span>
                <span className="text-slate-800">Spendwise Reports &lt;reports@spendwise.app&gt;</span>
              </p>
              <p className="truncate">
                <span className="inline-block w-14">To</span>
                <span className="text-slate-800">{recipients.join(", ") || "—"}</span>
              </p>
              <p className="truncate">
                <span className="inline-block w-14">Subject</span>
                <span className="font-semibold text-slate-900">{subject}</span>
              </p>
            </div>
            <div className="space-y-4 px-4 py-4">
              <p className="whitespace-pre-line text-sm text-slate-700">{message}</p>
              <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">{template.name} · {period.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(sum(scoped))}</p>
                <p className="text-xs text-indigo-100">across {scoped.length} expenses</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-slate-200">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-lg" aria-hidden>
                  {template.icon}
                </span>
                <div className="min-w-0 text-xs">
                  <p className="truncate font-medium text-slate-900">{artifact.filename}</p>
                  <p className="text-slate-500">
                    {template.format} · {formatBytes(byteLength(artifact.content))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
        <DemoBadge className="self-start sm:self-center" />
        <button type="button" onClick={mailto} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:mr-auto sm:pl-2">
          Open in my mail app instead
        </button>
        <button type="button" onClick={onClose} className={buttonSecondary}>
          Cancel
        </button>
        <button type="button" onClick={send} className={buttonPrimary}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
          </svg>
          Send report
        </button>
      </div>
    </Modal>
  );
}
