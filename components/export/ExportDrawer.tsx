"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { Spinner } from "@/components/ExpenseForm";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { useExpenses } from "@/components/ExpensesProvider";
import { useToast } from "@/components/ToastProvider";
import type { Category } from "@/lib/types";
import {
  EXPORT_FORMATS,
  SORT_LABELS,
  defaultFilename,
  filterByRangeAndKeyword,
  formatBytes,
  isRangeInvalid,
  sanitizeFilename,
  selectExportRows,
  summarize,
  type ExportOptions,
  type ExportSort,
} from "@/lib/export";
import { CategoryPicker } from "./CategoryPicker";
import { DateRangeField } from "./DateRangeField";
import { ExportPreview } from "./ExportPreview";
import { FormatPicker } from "./FormatPicker";
import { exportControl } from "./styles";
import { useExportJob, type ExportStage } from "./useExportJob";

interface Props {
  open: boolean;
  initial: ExportOptions;
  onClose: () => void;
  onExported: (options: ExportOptions) => void;
}

const STAGE_PROGRESS: Record<ExportStage, number> = { preparing: 25, encoding: 65, saving: 100 };

export function ExportDrawer({ open, initial, onClose, onExported }: Props) {
  const { expenses } = useExpenses();
  const { toast } = useToast();
  const job = useExportJob();
  const [options, setOptions] = useState<ExportOptions>(initial);
  const [filenameTouched, setFilenameTouched] = useState(initial.filename !== "");

  // Typing and toggling stay instant; the (potentially large) preview catches up.
  const deferred = useDeferredValue(options);
  const stale = deferred !== options;

  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));

  const format = EXPORT_FORMATS[options.format];
  const autoName = defaultFilename(options);
  const typedName = filenameTouched ? options.filename : autoName;
  const finalName = `${sanitizeFilename(typedName, format.extension) || autoName}.${format.extension}`;

  const bounds = useMemo(
    // Expenses are kept sorted newest-first.
    () => ({ earliest: expenses.at(-1)?.date ?? null, latest: expenses[0]?.date ?? null }),
    [expenses],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<Category, number>();
    if (isRangeInvalid(deferred)) return counts;
    for (const e of filterByRangeAndKeyword(expenses, deferred)) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return counts;
  }, [expenses, deferred]);

  const rows = useMemo(() => selectExportRows(expenses, deferred), [expenses, deferred]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const output = useMemo(
    () => EXPORT_FORMATS[deferred.format].inspect({ rows, summary, options: deferred, generatedAt: new Date() }),
    [rows, summary, deferred],
  );

  const rangeInvalid = isRangeInvalid(options);
  const issue = rangeInvalid
    ? "Fix the date range to see matching records."
    : options.categories.length === 0
      ? "Select at least one category to include."
      : rows.length === 0 && !stale
        ? "No expenses match these filters. Try widening the date range or including more categories."
        : null;

  const running = job.state.status === "running";
  const canExport = !issue && !running && rows.length > 0;

  const handleExport = async () => {
    if (!canExport) return;
    // Recompute from the live options in case the deferred preview is a frame behind.
    const fresh = selectExportRows(expenses, options);
    if (fresh.length === 0) return;
    const result = await job.run(fresh, options, finalName);
    if (!result) return;
    onExported(options);
    toast(
      `Exported ${result.count.toLocaleString()} record${result.count === 1 ? "" : "s"} to ${result.filename} (${formatBytes(result.bytes)})`,
    );
    onClose();
  };

  const handleClose = () => {
    if (running) job.cancel();
    onClose();
  };

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 text-sm" aria-live="polite">
        {job.state.status === "running" ? (
          <div className="max-w-sm">
            <p className="font-medium text-slate-900">{stageLabel(job.state.stage, format.label, rows.length)}</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-[width] duration-300 ease-out"
                style={{ width: `${STAGE_PROGRESS[job.state.stage]}%` }}
              />
            </div>
          </div>
        ) : job.state.status === "error" ? (
          <p className="font-medium text-red-600">{job.state.message}</p>
        ) : (
          <p className="truncate text-slate-500">
            Saves as <span className="font-mono text-[13px] font-medium text-slate-800">{finalName}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={running ? job.cancel : handleClose} className={`${buttonSecondary} px-4 py-2.5`}>
          {running ? "Stop" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!canExport}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          className={`${buttonPrimary} min-w-[11rem] px-4 py-2.5 disabled:cursor-not-allowed`}
        >
          {running ? (
            <>
              <Spinner />
              Exporting…
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Export {issue ? "" : `${rows.length.toLocaleString()} `}as {format.label}
              <kbd className="ml-1 hidden rounded bg-white/15 px-1.5 py-0.5 font-sans text-[11px] font-medium text-indigo-100 lg:inline">
                {isMac() ? "⌘↵" : "Ctrl ↵"}
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="Export expenses"
      description="Pick a format, narrow down the data, and preview exactly what will be exported."
      badge={
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-indigo-700 ring-1 ring-inset ring-indigo-200">
          {issue ? 0 : rows.length.toLocaleString()} selected
        </span>
      }
      footer={footer}
    >
      <div
        className="lg:grid lg:h-full lg:grid-cols-[400px_minmax(0,1fr)]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleExport();
          }
        }}
      >
        <fieldset disabled={running} className="min-w-0 space-y-7 border-slate-200 bg-white p-5 sm:p-6 lg:overflow-y-auto lg:border-r">
          <Section step={1} title="Format">
            <FormatPicker value={options.format} onChange={(f) => set("format", f)} />
          </Section>

          <Section step={2} title="Date range">
            <DateRangeField
              from={options.from}
              to={options.to}
              invalid={rangeInvalid}
              bounds={bounds}
              onChange={(r) => setOptions((o) => ({ ...o, ...r }))}
            />
          </Section>

          <Section step={3} title="Categories">
            <CategoryPicker selected={options.categories} onChange={(c) => set("categories", c)} counts={categoryCounts} />
            {options.categories.length === 0 && (
              <p className="mt-2 text-xs font-medium text-red-600">Select at least one category.</p>
            )}
          </Section>

          <Section step={4} title="Refine">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <div>
                <label htmlFor="export-keyword" className="mb-1 block text-xs font-medium text-slate-600">
                  Description contains
                </label>
                <input
                  id="export-keyword"
                  type="search"
                  placeholder="e.g. coffee"
                  value={options.keyword}
                  onChange={(e) => set("keyword", e.target.value)}
                  className={exportControl()}
                />
              </div>
              <div>
                <label htmlFor="export-sort" className="mb-1 block text-xs font-medium text-slate-600">
                  Sort rows
                </label>
                <select
                  id="export-sort"
                  value={options.sort}
                  onChange={(e) => set("sort", e.target.value as ExportSort)}
                  className={`${exportControl()} pr-8`}
                >
                  {(Object.keys(SORT_LABELS) as ExportSort[]).map((s) => (
                    <option key={s} value={s}>
                      {SORT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          <Section
            step={5}
            title="File name"
            action={
              filenameTouched && (
                <button
                  type="button"
                  onClick={() => {
                    setFilenameTouched(false);
                    set("filename", "");
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Reset to default
                </button>
              )
            }
          >
            <label htmlFor="export-filename" className="sr-only">
              File name
            </label>
            <div className="flex rounded-lg bg-white shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-indigo-600">
              <input
                id="export-filename"
                type="text"
                spellCheck={false}
                autoComplete="off"
                value={typedName}
                placeholder={autoName}
                onChange={(e) => {
                  setFilenameTouched(true);
                  set("filename", e.target.value);
                }}
                className="min-w-0 flex-1 rounded-l-lg border-0 bg-transparent px-3 py-2 font-mono text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
              <span className="flex items-center rounded-r-lg border-l border-slate-200 bg-slate-50 px-3 font-mono text-[13px] text-slate-500">
                .{format.extension}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {!filenameTouched
                ? "Updates automatically with your date range until you edit it."
                : sanitizeFilename(typedName, format.extension) !== typedName.trim()
                  ? "Characters that aren't allowed in file names will be replaced."
                  : "Custom name — the extension is added for you."}
            </p>
          </Section>
        </fieldset>

        <div className="p-5 sm:p-6 lg:overflow-y-auto">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Preview</h3>
          <ExportPreview
            rows={rows}
            summary={summary}
            totalRecords={expenses.length}
            format={deferred.format}
            output={output}
            stale={stale}
            emptyReason={issue}
          />
        </div>
      </div>
    </Drawer>
  );
}

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

function stageLabel(stage: ExportStage, formatLabel: string, count: number): string {
  switch (stage) {
    case "preparing":
      return `Collecting ${count.toLocaleString()} record${count === 1 ? "" : "s"}…`;
    case "encoding":
      return `Generating ${formatLabel} file…`;
    case "saving":
      return "Starting download…";
  }
}

function Section({
  step,
  title,
  action,
  children,
}: {
  step: number;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white" aria-hidden>
            {step}
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
