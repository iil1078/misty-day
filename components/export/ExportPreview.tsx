"use client";

import { useId, useState } from "react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_STYLES, type Expense } from "@/lib/types";
import { EXPORT_FORMATS, formatBytes, type ExportFormatId, type ExportOutputInfo, type ExportSummary } from "@/lib/export";

interface Props {
  rows: Expense[];
  summary: ExportSummary;
  totalRecords: number;
  format: ExportFormatId;
  output: ExportOutputInfo;
  stale: boolean;
  emptyReason: string | null;
}

const PREVIEW_ROWS = 100;
const RAW_LINES = 80;

export function ExportPreview({ rows, summary, totalRecords, format, output, stale, emptyReason }: Props) {
  const [tab, setTab] = useState<"table" | "raw">("table");
  const tabsId = useId();
  const showRaw = tab === "raw" && output.kind === "text";

  return (
    <div className={`space-y-4 transition-opacity ${stale ? "opacity-60" : ""}`} aria-busy={stale}>
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Records" value={summary.count.toLocaleString()} hint={`of ${totalRecords.toLocaleString()} total`} />
        <Stat label="Total amount" value={formatCurrency(summary.total)} hint={summary.count ? `avg ${formatCurrency(summary.average)}` : "—"} />
        <Stat
          label="Date span"
          value={summary.earliest ? formatDate(summary.earliest) : "—"}
          hint={summary.latest && summary.latest !== summary.earliest ? `to ${formatDate(summary.latest)}` : summary.earliest ? "single day" : "no records"}
        />
        <Stat
          label={`${EXPORT_FORMATS[format].label} output`}
          value={output.kind === "pages" ? `${output.pages} page${output.pages === 1 ? "" : "s"}` : formatBytes(output.bytes)}
          hint={output.kind === "pages" ? "US Letter, portrait" : format === "csv" ? "UTF-8, Excel-ready" : "UTF-8, pretty-printed"}
        />
      </dl>

      {summary.count > 0 && <Distribution summary={summary} />}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
          <div role="tablist" aria-label="Preview mode" className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {(["table", "raw"] as const).map((t) => {
              const disabled = t === "raw" && output.kind !== "text";
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${t}`}
                  aria-selected={(t === "raw") === showRaw}
                  aria-controls={`${tabsId}-panel`}
                  disabled={disabled}
                  title={disabled ? "Raw preview isn't available for PDF" : undefined}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-2.5 py-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    (t === "raw") === showRaw ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t === "table" ? "Table" : `Raw ${EXPORT_FORMATS[format].label}`}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500" aria-live="polite">
            {rows.length > PREVIEW_ROWS && !showRaw
              ? `Showing first ${PREVIEW_ROWS} of ${rows.length.toLocaleString()} rows`
              : stale
                ? "Updating…"
                : "Live preview"}
          </p>
        </div>

        <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${showRaw ? "raw" : "table"}`}>
          {emptyReason ? (
            <EmptyPreview reason={emptyReason} />
          ) : showRaw ? (
            <RawPreview text={output.kind === "text" ? output.text : ""} />
          ) : (
            <PreviewTable rows={rows.slice(0, PREVIEW_ROWS)} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-lg font-semibold tabular-nums tracking-tight text-slate-900">{value}</dd>
      <dd className="truncate text-xs text-slate-400">{hint}</dd>
    </div>
  );
}

function Distribution({ summary }: { summary: ExportSummary }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Share of total by category">
        {summary.byCategory.map((c) => (
          <div
            key={c.category}
            style={{ width: `${(c.total / summary.total) * 100}%`, backgroundColor: CATEGORY_STYLES[c.category].color }}
            className="min-w-[3px]"
          />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {summary.byCategory.map((c) => (
          <li key={c.category} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_STYLES[c.category].color }} aria-hidden />
            {c.category}
            <span className="tabular-nums text-slate-400">{summary.total ? Math.round((c.total / summary.total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewTable({ rows }: { rows: Expense[] }) {
  return (
    <div className="max-h-[26rem] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500 shadow-[inset_0_-1px_0_theme(colors.slate.200)]">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-2 font-medium">Date</th>
            <th scope="col" className="px-4 py-2 font-medium">Category</th>
            <th scope="col" className="w-full px-4 py-2 font-medium">Description</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-2 tabular-nums text-slate-600">{formatDate(e.date)}</td>
              <td className="px-4 py-2">
                <CategoryBadge category={e.category} />
              </td>
              <td className="max-w-0 truncate px-4 py-2 text-slate-900" title={e.description}>
                {e.description}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums text-slate-900">
                {formatCurrency(e.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RawPreview({ text }: { text: string }) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const shown = lines.slice(0, RAW_LINES);
  return (
    <div className="max-h-[26rem] overflow-auto bg-slate-950 py-3 font-mono text-[12px] leading-5 text-slate-200">
      <pre className="min-w-max">
        {shown.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-12 shrink-0 select-none pr-4 text-right text-slate-600">{i + 1}</span>
            <span className="pr-4">{line || " "}</span>
          </div>
        ))}
        {lines.length > RAW_LINES && (
          <div className="flex text-slate-500">
            <span className="w-12 shrink-0 pr-4 text-right">⋯</span>
            <span>{(lines.length - RAW_LINES).toLocaleString()} more lines</span>
          </div>
        )}
      </pre>
    </div>
  );
}

function EmptyPreview({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-900">Nothing to export</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{reason}</p>
    </div>
  );
}
