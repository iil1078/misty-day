"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { PERIOD_LABELS, inPeriod, resolvePeriod } from "@/lib/cloud/periods";
import { buildSnapshot, encodeSnapshot, shareUrl } from "@/lib/cloud/share";
import type { PeriodId, ShareLink } from "@/lib/cloud/types";
import { byteLength, formatBytes, relativeTime, uid } from "@/lib/cloud/util";
import { Spinner } from "../ExpenseForm";
import { useExpenses } from "../ExpensesProvider";
import { useToast } from "../ToastProvider";
import { buttonPrimary } from "../ui";
import { useCloud, useNow } from "./CloudProvider";
import { Field, StatusChip, Toggle, inputClass } from "./controls";

const EXPIRY_OPTIONS = [
  { label: "24 hours", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "Never", days: 0 },
];

const PERIODS: PeriodId[] = ["this-month", "last-month", "last-3-months", "this-year", "last-year", "all"];

function useQrCode(url: string | null): { src: string | null; error: boolean } {
  const [state, setState] = useState<{ src: string | null; error: boolean }>({ src: null, error: false });
  useEffect(() => {
    if (!url) return setState({ src: null, error: false });
    let cancelled = false;
    QRCode.toDataURL(url, { errorCorrectionLevel: "L", margin: 1, width: 480, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((src) => !cancelled && setState({ src, error: false }))
      // Payloads beyond QR capacity (~2.9 KB) throw; the UI suggests a summary-only link.
      .catch(() => !cancelled && setState({ src: null, error: true }));
    return () => {
      cancelled = true;
    };
  }, [url]);
  return state;
}

export function SharePanel() {
  const { expenses } = useExpenses();
  const { state, addShare, deleteShare } = useCloud();
  const { toast } = useToast();
  const now = useNow();

  const [periodId, setPeriodId] = useState<PeriodId>("this-month");
  const period = resolvePeriod(periodId);
  const [title, setTitle] = useState("");
  const [includeRows, setIncludeRows] = useState(true);
  const [redacted, setRedacted] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = state.shares.find((s) => s.id === activeId) ?? null;
  const qr = useQrCode(active?.url ?? null);
  const scopedCount = inPeriod(expenses, period).length;

  const create = async () => {
    setCreating(true);
    try {
      const rows = inPeriod(expenses, period);
      const finalTitle = title.trim() || `Spending — ${period.label}`;
      const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 86_400_000).toISOString() : null;
      const token = await encodeSnapshot(buildSnapshot(rows, { title: finalTitle, period: period.label, expiresAt, redacted, includeRows }));
      const share: ShareLink = {
        id: uid("shr"),
        title: finalTitle,
        url: shareUrl(window.location.origin, token),
        periodId,
        createdAt: new Date().toISOString(),
        expiresAt,
        redacted: includeRows && redacted,
        includeRows,
        rowCount: rows.length,
      };
      addShare(share);
      setActiveId(share.id);
      setTitle("");
    } catch (e) {
      console.error(e);
      toast("Couldn't create the link. Please try again.", { variant: "error" });
    } finally {
      setCreating(false);
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard");
    } catch {
      toast("Clipboard access was blocked by the browser.", { variant: "error" });
    }
  };

  const nativeShare = async (s: ShareLink) => {
    try {
      await navigator.share({ title: s.title, text: `${s.title} — shared from Spendwise`, url: s.url });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="space-y-5 self-start rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
        <div>
          <h3 className="font-semibold text-slate-900">Create a snapshot link</h3>
          <p className="mt-1 text-sm text-slate-500">
            A read-only report anyone can open — no account needed. The data is compressed into the link itself, in the part after <code className="rounded bg-slate-100 px-1">#</code>,
            which browsers never send to a server.
          </p>
        </div>
        <Field label="Title" htmlFor="share-title">
          <input id="share-title" value={title} placeholder={`Spending — ${period.label}`} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Period" htmlFor="share-period" hint={`${scopedCount} expenses`}>
            <select id="share-period" value={periodId} onChange={(e) => setPeriodId(e.target.value as PeriodId)} className={`${inputClass} pr-8`}>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Link expires" htmlFor="share-expiry">
            <select id="share-expiry" value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))} className={`${inputClass} pr-8`}>
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="space-y-4 rounded-xl bg-slate-50 p-4">
          <Toggle checked={includeRows} onChange={setIncludeRows} label="Include transactions" description="Off = totals and charts only. Shorter link, easier to scan." />
          <Toggle
            checked={includeRows && redacted}
            onChange={setRedacted}
            disabled={!includeRows}
            label="Hide descriptions"
            description="Share amounts and categories without revealing what you bought."
          />
        </div>
        <button type="button" onClick={create} disabled={creating} className={`${buttonPrimary} w-full py-2.5`}>
          {creating ? <Spinner /> : "🔗"} Generate link
        </button>
      </section>

      <div className="space-y-6">
        {active && (
          <section className="animate-slide-up overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-5 text-white shadow-lg sm:p-6" aria-live="polite">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="flex h-40 w-40 items-center justify-center rounded-xl bg-white p-2">
                  {qr.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr.src} alt={`QR code for ${active.title}`} className="h-full w-full" />
                  ) : qr.error ? (
                    <p className="px-2 text-center text-xs text-slate-500">Too much data for a QR code. Turn off “Include transactions” for a scannable link.</p>
                  ) : (
                    <Spinner className="h-5 w-5 text-indigo-600" />
                  )}
                </div>
                {qr.src && (
                  <a href={qr.src} download={`${active.title.replace(/[^\w-]+/g, "-")}-qr.png`} className="text-xs font-semibold text-indigo-100 hover:text-white">
                    Download QR
                  </a>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">Ready to share</p>
                <h3 className="mt-1 truncate text-lg font-semibold">{active.title}</h3>
                <div className="mt-3 flex gap-2">
                  <input
                    readOnly
                    value={active.url}
                    onFocus={(e) => e.target.select()}
                    aria-label="Share link"
                    className="min-w-0 flex-1 rounded-lg border-0 bg-white/10 px-3 py-2 font-mono text-xs text-white ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-white"
                  />
                  <button type="button" onClick={() => copy(active.url)} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                    Copy
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <a href={active.url} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">
                    Open preview ↗
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(active.title)}&body=${encodeURIComponent(`Here's a read-only snapshot of my spending:\n\n${active.url}`)}`}
                    className="rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20"
                  >
                    Email link
                  </a>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <button type="button" onClick={() => nativeShare(active)} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">
                      Share…
                    </button>
                  )}
                </div>
                <p className="mt-4 text-xs text-indigo-100">
                  {formatBytes(byteLength(active.url))} link · {active.includeRows ? `${active.rowCount} transactions` : "summary only"}
                  {active.redacted && " · descriptions hidden"} · {active.expiresAt ? `expires ${relativeTime(active.expiresAt, now)}` : "never expires"}. Nothing was uploaded.
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Your links</h3>
          {state.shares.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
              <p className="text-3xl" aria-hidden>
                🔗
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">No shared links yet</p>
              <p className="mt-1 text-sm text-slate-500">Share a month with your partner, or a year with your accountant.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
              {state.shares.map((s) => {
                const expired = s.expiresAt !== null && new Date(s.expiresAt).getTime() < now;
                return (
                  <li key={s.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 ${s.id === activeId ? "bg-indigo-50/50" : ""}`}>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-medium text-slate-900">{s.title}</p>
                      <p className="text-xs text-slate-500">
                        {PERIOD_LABELS[s.periodId]} · created {relativeTime(s.createdAt, now)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {expired ? (
                        <StatusChip tone="red">Expired</StatusChip>
                      ) : (
                        <StatusChip tone="green">{s.expiresAt ? `Expires ${relativeTime(s.expiresAt, now)}` : "No expiry"}</StatusChip>
                      )}
                      {!s.includeRows && <StatusChip tone="slate">Summary only</StatusChip>}
                      {s.redacted && <StatusChip tone="amber">🔒 Redacted</StatusChip>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setActiveId(s.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                        QR
                      </button>
                      <button type="button" onClick={() => copy(s.url)} className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteShare(s.id);
                          if (activeId === s.id) setActiveId(null);
                        }}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Because the data lives inside the link, removing it here only clears your list — anyone who already has a link can open it until it expires. Expiry is checked by the
            viewer page; treat links like the data they contain.
          </p>
        </section>
      </div>
    </div>
  );
}
