"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatCurrencyCompact, formatMonthKey } from "@/lib/format";

interface MonthlyChartProps {
  data: { key: string; total: number }[];
}

const HEIGHT = 240;
const PAD = { top: 16, right: 8, bottom: 28, left: 52 };
const BAR_COLOR = "#2a78d6";
const BAR_COLOR_ACTIVE = "#1c5cab";

/** "Nice" upper bound and tick step for the y-axis. */
function niceScale(max: number, ticks = 4): { top: number; step: number } {
  if (max <= 0) return { top: 100, step: 25 };
  const rough = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { top: Math.ceil(max / step) * step, step };
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  // Draw at the container's real pixel width so text stays legible at any size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [showTable]);

  const max = Math.max(...data.map((d) => d.total), 0);
  const { top, step } = niceScale(max);
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(44, slot * 0.6);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  const activeDatum = active !== null ? data[active] : null;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1.5 font-medium">Month</th>
              <th className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((d) => (
              <tr key={d.key}>
                <td className="py-1.5 text-slate-700">{formatMonthKey(d.key, true)}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-900">{formatCurrency(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div ref={containerRef} className="relative">
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            className="block"
            role="img"
            aria-label={`Monthly spending: ${data.map((d) => `${formatMonthKey(d.key, true)} ${formatCurrency(d.total)}`).join(", ")}`}
            onMouseLeave={() => setActive(null)}
          >
            {/* Recessive grid + y-axis labels */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef2f6"} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400" fontSize={11}>
                  {formatCurrencyCompact(t)}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const cx = PAD.left + slot * i + slot / 2;
              const h = Math.max(0, y(0) - y(d.total));
              const r = Math.min(4, h);
              const x0 = cx - barW / 2;
              const yTop = y(d.total);
              const isActive = active === i;
              return (
                <g key={d.key}>
                  {/* Bar with rounded data-end, square at the baseline */}
                  {h > 0 && (
                    <path
                      d={`M${x0},${y(0)} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${y(0)} Z`}
                      fill={isActive ? BAR_COLOR_ACTIVE : BAR_COLOR}
                      opacity={active === null || isActive ? 1 : 0.55}
                      className="transition-opacity"
                    />
                  )}
                  <text x={cx} y={HEIGHT - 8} textAnchor="middle" fontSize={11} className={isActive ? "fill-slate-900 font-medium" : "fill-slate-500"}>
                    {formatMonthKey(d.key)}
                  </text>
                  {/* Hit target: whole column, larger than the mark */}
                  <rect
                    x={PAD.left + slot * i}
                    y={PAD.top}
                    width={slot}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setActive(i)}
                    onTouchStart={() => setActive(i)}
                  />
                </g>
              );
            })}
          </svg>

          {activeDatum && active !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
              style={{
                left: `${((PAD.left + slot * active + slot / 2) / width) * 100}%`,
                top: `${(Math.max(y(activeDatum.total), PAD.top + 30) / HEIGHT) * 100}%`,
                marginTop: -8,
              }}
            >
              <div className="text-slate-300">{formatMonthKey(activeDatum.key, true)}</div>
              <div className="font-semibold tabular-nums">{formatCurrency(activeDatum.total)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
