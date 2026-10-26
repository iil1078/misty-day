"use client";

import { useState } from "react";
import { CATEGORY_STYLES } from "@/lib/types";
import type { TemplateId } from "@/lib/cloud/types";
import { Modal } from "../Modal";
import { useExpenses } from "../ExpensesProvider";
import { useToast } from "../ToastProvider";
import { buttonPrimary, buttonSecondary } from "../ui";
import { useCloud } from "./CloudProvider";
import { ConsentScreen } from "./ConsentScreen";
import { DemoBadge, Field, inputClass } from "./controls";
import { ServiceLogo } from "./ServiceLogo";

type Step = "connect" | "configure" | "preview";

const TABS: { id: TemplateId; label: string; required?: boolean }[] = [
  { id: "ledger", label: "Ledger", required: true },
  { id: "monthly-summary", label: "Monthly summary" },
  { id: "category-analysis", label: "Categories" },
];

const EXISTING_SHEETS = ["Household Budget 2026", "Personal Finances", "Shared — Apartment costs"];
const PREVIEW_ROWS = 14;

export function SheetsWizard({ onClose }: { onClose: () => void }) {
  const { expenses } = useExpenses();
  const { state, connect, updateConnection, runExport } = useCloud();
  const { toast } = useToast();
  const conn = state.connections["google-sheets"];
  const [step, setStep] = useState<Step>(conn ? "configure" : "connect");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("Spendwise — Expenses");
  const [existing, setExisting] = useState(EXISTING_SHEETS[0]);
  const [tabs, setTabs] = useState<TemplateId[]>(["ledger", "monthly-summary"]);
  const [live, setLive] = useState(true);
  const sheetName = mode === "new" ? name.trim() || "Spendwise — Expenses" : existing;

  const steps: { id: Step; label: string }[] = [
    { id: "connect", label: "Connect" },
    { id: "configure", label: "Configure" },
    { id: "preview", label: "Preview" },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  // Real, useful fallback: tab-separated values paste straight into any spreadsheet as a grid.
  const copyTsv = async () => {
    const tsv = [
      ["Date", "Category", "Description", "Amount"].join("\t"),
      ...expenses.map((e) => [e.date, e.category, e.description.replace(/[\t\n]/g, " "), e.amount.toFixed(2)].join("\t")),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      toast(`Copied ${expenses.length} rows — paste into any sheet with ⌘V / Ctrl+V`);
    } catch {
      toast("Clipboard access was blocked by the browser.", { variant: "error" });
    }
  };

  const create = () => {
    for (const id of tabs) {
      runExport({ templateId: id, periodId: id === "monthly-summary" ? "this-month" : "all", destinationId: "google-sheets", detail: `${sheetName} › ${TABS.find((t) => t.id === id)!.label}` });
    }
    updateConnection("google-sheets", { autoSync: live, autoSyncTemplate: "ledger", folder: sheetName });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Sync with Google Sheets" description="Build a spreadsheet from your expenses — and keep it up to date." size="xl">
      <ol className="mb-6 flex items-center gap-2 text-xs font-medium" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                i < stepIndex ? "bg-emerald-500 text-white" : i === stepIndex ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
              aria-current={i === stepIndex ? "step" : undefined}
            >
              {i < stepIndex ? "✓" : i + 1}
            </span>
            <span className={i === stepIndex ? "text-slate-900" : "text-slate-400"}>{s.label}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-slate-200" aria-hidden />}
          </li>
        ))}
      </ol>

      {step === "connect" && (
        <ConsentScreen
          id="google-sheets"
          onCancel={onClose}
          onAuthorized={(account) => {
            connect("google-sheets", account);
            setStep("configure");
          }}
        />
      )}

      {step === "configure" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200">
            <ServiceLogo id="google-sheets" className="h-8 w-8" />
            <span className="text-slate-600">
              Connected as <span className="font-medium text-slate-900">{state.connections["google-sheets"]?.account}</span>
            </span>
            <DemoBadge className="ml-auto" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["new", "existing"] as const).map((m) => (
              <label key={m} className={`cursor-pointer rounded-xl p-4 ring-1 transition ${mode === m ? "bg-emerald-50/60 ring-emerald-500" : "ring-slate-200 hover:bg-slate-50"}`}>
                <input type="radio" name="sheet-mode" className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
                <span className="block text-sm font-semibold text-slate-900">{m === "new" ? "Create a new spreadsheet" : "Add to an existing one"}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{m === "new" ? "Spendwise creates and owns the file." : "New tabs are added; your other tabs are untouched."}</span>
              </label>
            ))}
          </div>

          {mode === "new" ? (
            <Field label="Spreadsheet name" htmlFor="sheet-name">
              <input id="sheet-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
          ) : (
            <Field label="Spreadsheet" htmlFor="sheet-existing">
              <select id="sheet-existing" value={existing} onChange={(e) => setExisting(e.target.value)} className={`${inputClass} pr-8`}>
                {EXISTING_SHEETS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          )}

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-slate-600">Tabs to create</legend>
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => {
                const on = tabs.includes(t.id);
                return (
                  <label key={t.id} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${on ? "bg-white ring-slate-300" : "ring-slate-200 text-slate-400"} ${t.required ? "cursor-default" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={t.required}
                      onChange={(e) => setTabs((list) => (e.target.checked ? [...list, t.id] : list.filter((x) => x !== t.id)))}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    {t.label}
                    {t.required && <span className="text-[11px] text-slate-400">required</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-slate-600">Sync mode</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { v: true, title: "Live sync", body: "Rows update within seconds whenever you add, edit, or delete an expense.", tag: "Recommended" },
                { v: false, title: "One-time export", body: "A snapshot of today's data. Run it again whenever you like.", tag: null },
              ].map((o) => (
                <label key={String(o.v)} className={`cursor-pointer rounded-xl p-4 ring-1 transition ${live === o.v ? "bg-emerald-50/60 ring-emerald-500" : "ring-slate-200 hover:bg-slate-50"}`}>
                  <input type="radio" name="sheet-sync" className="sr-only" checked={live === o.v} onChange={() => setLive(o.v)} />
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {o.title}
                    {o.tag && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">{o.tag}</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{o.body}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {step === "preview" && (
        <div className="overflow-hidden rounded-xl ring-1 ring-slate-300">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
            <ServiceLogo id="google-sheets" className="h-7 w-7" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{sheetName}</p>
              <p className="text-[11px] text-slate-500">File  Edit  View  Insert  Format  Data</p>
            </div>
            <span className="ml-auto text-[11px] text-slate-400">{live ? "Live sync on" : "Snapshot"}</span>
          </div>
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[11px] text-slate-500">
            <span className="w-8 text-slate-400">fx</span>=SUM(D2:D{expenses.length + 1})
          </div>
          <div className="max-h-72 overflow-auto bg-white">
            <table className="w-full border-collapse font-[Arial,sans-serif] text-[12px]">
              <thead>
                <tr className="bg-slate-100 text-slate-500">
                  <th className="w-10 border border-slate-200 font-normal" />
                  {["A", "B", "C", "D"].map((c) => (
                    <th key={c} className="border border-slate-200 px-2 py-0.5 font-normal">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 bg-slate-100 text-center text-slate-500">1</td>
                  {["Date", "Category", "Description", "Amount"].map((h) => (
                    <td key={h} className="border border-slate-200 bg-emerald-50 px-2 py-1 font-bold text-slate-800">
                      {h}
                    </td>
                  ))}
                </tr>
                {expenses.slice(0, PREVIEW_ROWS).map((e, i) => (
                  <tr key={e.id}>
                    <td className="border border-slate-200 bg-slate-100 text-center text-slate-500">{i + 2}</td>
                    <td className="border border-slate-200 px-2 py-1 tabular-nums">{e.date}</td>
                    <td className="border border-slate-200 px-2 py-1">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_STYLES[e.category].color }} aria-hidden />
                      {e.category}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">{e.description}</td>
                    <td className="border border-slate-200 px-2 py-1 text-right tabular-nums">{e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-1 border-t border-slate-200 bg-slate-50 px-2 py-1">
            {TABS.filter((t) => tabs.includes(t.id)).map((t, i) => (
              <span key={t.id} className={`rounded-t px-3 py-1 text-[11px] font-medium ${i === 0 ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>
                {t.label}
              </span>
            ))}
            <span className="ml-auto self-center pr-1 text-[11px] text-slate-400">{expenses.length} rows</span>
          </div>
        </div>
      )}

      {step !== "connect" && (
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <button type="button" onClick={copyTsv} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:mr-auto" title="Copies tab-separated rows you can paste into any spreadsheet">
            Copy rows to clipboard instead
          </button>
          {step === "preview" ? (
            <>
              <button type="button" onClick={() => setStep("configure")} className={buttonSecondary}>
                Back
              </button>
              <button type="button" onClick={create} className={`${buttonPrimary} bg-emerald-600 hover:bg-emerald-500`}>
                {live ? "Create & start syncing" : "Create spreadsheet"}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className={buttonSecondary}>
                Cancel
              </button>
              <button type="button" onClick={() => setStep("preview")} className={buttonPrimary}>
                Preview →
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
