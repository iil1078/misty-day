"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PageLoading } from "@/components/ui";
import { decodeSnapshot, type SnapshotPayload } from "@/lib/cloud/share";
import { formatDateTime } from "@/lib/cloud/util";
import { formatCurrency, formatDate, formatMonthKey } from "@/lib/format";
import { CATEGORIES, CATEGORY_STYLES } from "@/lib/types";

type ViewState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "expired"; data: SnapshotPayload } | { kind: "ready"; data: SnapshotPayload };

export default function SharedSnapshotPage() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    const load = () => {
      const token = window.location.hash.slice(1);
      if (!token) return setView({ kind: "error", message: "This link is missing its data. Ask the sender for a fresh link." });
      decodeSnapshot(token)
        .then((data) =>
          setView(data.expiresAt && new Date(data.expiresAt) < new Date() ? { kind: "expired", data } : { kind: "ready", data }),
        )
        .catch(() => setView({ kind: "error", message: "This link looks incomplete or corrupted. Make sure you copied the whole thing." }));
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  if (view.kind === "loading") return <PageLoading label="Opening shared snapshot…" />;
  if (view.kind !== "ready") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-4xl" aria-hidden>
          {view.kind === "expired" ? "⌛" : "🔗"}
        </p>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">{view.kind === "expired" ? "This link has expired" : "Can't open this link"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {view.kind === "expired" ? `“${view.data.title}” stopped being available ${formatDateTime(view.data.expiresAt!)}.` : view.message}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Go to Spendwise →
        </Link>
      </div>
    );
  }

  const d = view.data;
  const total = d.totalCents / 100;
  const top = [...d.categories].sort((a, b) => b[1] - a[1])[0];
  const maxMonth = Math.max(1, ...d.months.map(([, c]) => c));

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 px-6 py-7 text-white shadow-lg sm:px-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium ring-1 ring-inset ring-white/20">🔒 Read-only snapshot</span>
          {d.redacted && <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium ring-1 ring-inset ring-white/20">Descriptions hidden</span>}
          {d.expiresAt && <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium ring-1 ring-inset ring-white/20">Available until {formatDateTime(d.expiresAt)}</span>}
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{d.title}</h1>
        <p className="mt-1 text-sm text-indigo-200">
          {d.period} · shared {formatDateTime(d.createdAt)}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Total spent", formatCurrency(total)],
          ["Transactions", d.count.toLocaleString()],
          ["Average", formatCurrency(d.count ? total / d.count : 0)],
          ["Top category", top ? `${CATEGORY_STYLES[top[0]].icon} ${top[0]}` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <h2 className="font-semibold text-slate-900">By category</h2>
          <ul className="mt-4 space-y-3">
            {[...d.categories]
              .sort((a, b) => b[1] - a[1])
              .map(([cat, cents, count]) => (
                <li key={cat}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {CATEGORY_STYLES[cat].icon} {cat} <span className="font-normal text-slate-400">· {count}</span>
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(cents / 100)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(cents / Math.max(1, d.totalCents)) * 100}%`, backgroundColor: CATEGORY_STYLES[cat].color }} />
                  </div>
                </li>
              ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <h2 className="font-semibold text-slate-900">By month</h2>
          <div className="mt-4 flex h-48 items-end gap-2" role="img" aria-label="Monthly totals">
            {d.months.map(([key, cents]) => (
              <div key={key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] tabular-nums text-slate-500">{formatCurrency(cents / 100).replace(/\.\d\d$/, "")}</span>
                <div className="w-full max-w-[3rem] rounded-t-md bg-indigo-500" style={{ height: `${Math.max(2, (cents / maxMonth) * 140)}px` }} />
                <span className="text-xs text-slate-500">{formatMonthKey(key)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {d.rows && d.rows.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <h2 className="px-5 pt-5 font-semibold text-slate-900 sm:px-6">Transactions</h2>
          <div className="mt-3 max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium sm:px-6">Date</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="w-full px-3 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 text-right font-medium sm:px-6">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.rows.map(([date, catIndex, cents, description], i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-5 py-2 text-slate-600 sm:px-6">{formatDate(date)}</td>
                    <td className="px-3 py-2">{CATEGORIES[catIndex] && <CategoryBadge category={CATEGORIES[catIndex]} />}</td>
                    <td className="max-w-0 truncate px-3 py-2 text-slate-900">{description ?? <span className="italic text-slate-400">Hidden</span>}</td>
                    <td className="whitespace-nowrap px-5 py-2 text-right font-medium tabular-nums text-slate-900 sm:px-6">{formatCurrency(cents / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-center text-xs text-slate-400">
        This page was rendered entirely from the link — no data was fetched from a server.{" "}
        <Link href="/" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Track your own spending with Spendwise →
        </Link>
      </p>
    </div>
  );
}
