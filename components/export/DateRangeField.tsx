"use client";

import { DATE_PRESETS, matchPreset } from "@/lib/export";
import { formatDate, todayISO } from "@/lib/format";
import { exportControl } from "./styles";

interface Props {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  invalid: boolean;
  /** Earliest and latest dates in the whole dataset, for context. */
  bounds: { earliest: string | null; latest: string | null };
}

export function DateRangeField({ from, to, onChange, invalid, bounds }: Props) {
  const active = matchPreset(from, to);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick date ranges">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={active === p.id}
            onClick={() => onChange(p.range(new Date()))}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
              active === p.id
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {p.label}
          </button>
        ))}
        {active === null && (
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
            Custom
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="export-from" className="mb-1 block text-xs font-medium text-slate-600">
            Start date
          </label>
          <input
            id="export-from"
            type="date"
            value={from}
            max={to || todayISO()}
            onChange={(e) => onChange({ from: e.target.value, to })}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "export-range-error" : undefined}
            className={exportControl(invalid)}
          />
        </div>
        <div>
          <label htmlFor="export-to" className="mb-1 block text-xs font-medium text-slate-600">
            End date
          </label>
          <input
            id="export-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onChange({ from, to: e.target.value })}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "export-range-error" : undefined}
            className={exportControl(invalid)}
          />
        </div>
      </div>

      {invalid ? (
        <p id="export-range-error" className="text-xs font-medium text-red-600">
          Start date must be on or before the end date.
        </p>
      ) : (
        bounds.earliest &&
        bounds.latest && (
          <p className="text-xs text-slate-500">
            Your data spans {formatDate(bounds.earliest)} – {formatDate(bounds.latest)}. Leave a date empty for no limit.
          </p>
        )
      )}
    </div>
  );
}
