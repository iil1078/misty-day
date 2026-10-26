"use client";

import { EXPORT_FORMATS, EXPORT_FORMAT_ORDER, type ExportFormatId } from "@/lib/export";

const ICONS: Record<ExportFormatId, React.ReactNode> = {
  csv: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25M3.375 19.5A1.125 1.125 0 012.25 18.375V5.625m1.125 13.875h7.5m-8.625-13.875c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125m-17.25-13.875h17.25M2.25 10.5h19.5M2.25 15h19.5M10.875 4.5v15" />
  ),
  json: <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />,
  pdf: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zM9 13.5h6M9 16.5h6M9 10.5h1.5" />
  ),
};

export function FormatPicker({ value, onChange }: { value: ExportFormatId; onChange: (id: ExportFormatId) => void }) {
  return (
    <div role="radiogroup" aria-label="File format" className="grid grid-cols-3 gap-2">
      {EXPORT_FORMAT_ORDER.map((id) => {
        const format = EXPORT_FORMATS[id];
        const selected = value === id;
        return (
          <label
            key={id}
            className={`group relative flex cursor-pointer flex-col items-start gap-2 rounded-xl p-3 ring-1 transition focus-within:ring-2 focus-within:ring-indigo-600 ${
              selected ? "bg-indigo-50/70 ring-indigo-600" : "bg-white ring-slate-200 hover:ring-slate-300"
            }`}
          >
            <input
              type="radio"
              name="export-format"
              value={id}
              checked={selected}
              onChange={() => onChange(id)}
              data-autofocus={selected ? "" : undefined}
              className="sr-only"
            />
            <span className="flex w-full items-center justify-between">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                className={`h-6 w-6 ${selected ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"}`}
                aria-hidden
              >
                {ICONS[id]}
              </svg>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-inset ${
                  selected ? "bg-indigo-600 ring-indigo-600" : "bg-white ring-slate-300"
                }`}
                aria-hidden
              >
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">{format.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500">{format.tagline}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
