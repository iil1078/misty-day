"use client";

import { useState } from "react";
import { DESTINATIONS } from "@/lib/cloud/destinations";
import type { DestinationId } from "@/lib/cloud/types";
import { sleep } from "@/lib/cloud/util";
import { Spinner } from "../ExpenseForm";
import { buttonPrimary, buttonSecondary } from "../ui";
import { DemoBadge, inputClass } from "./controls";
import { ServiceLogo, SpendwiseLogo } from "./ServiceLogo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A simulated OAuth consent window. In production this would be a popup to
 * the provider; here it shows the same information so the flow can be tried.
 */
export function ConsentScreen({
  id,
  onAuthorized,
  onCancel,
}: {
  id: DestinationId;
  onAuthorized: (account: string) => void;
  onCancel: () => void;
}) {
  const dest = DESTINATIONS[id];
  const [account, setAccount] = useState("");
  const [phase, setPhase] = useState<"consent" | "authorizing">("consent");
  const valid = EMAIL_RE.test(account.trim());

  const allow = async () => {
    if (!valid) return;
    setPhase("authorizing");
    await sleep(1100);
    onAuthorized(account.trim());
  };

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      {/* Mock browser chrome so it reads as an external authorization window. */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </span>
        <span className="flex flex-1 items-center gap-1.5 truncate rounded-md bg-white px-2 py-1 font-mono text-[11px] text-slate-500">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-emerald-600" aria-hidden>
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
          {dest.authDomain}/oauth/authorize?client_id=spendwise
        </span>
        <DemoBadge />
      </div>

      <div className="bg-white px-6 py-6">
        <div className="flex items-center justify-center gap-3">
          <SpendwiseLogo className="h-11 w-11" />
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <ServiceLogo id={id} className="h-11 w-11" />
        </div>
        <h3 className="mt-4 text-center text-base font-semibold text-slate-900">Spendwise wants to access your {dest.name} account</h3>

        {phase === "authorizing" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-sm text-slate-500" role="status">
            <Spinner className="h-6 w-6 text-indigo-600" />
            Authorizing with {dest.name}…
          </div>
        ) : (
          <>
            <div className="mt-5">
              <label htmlFor="consent-account" className="mb-1 block text-xs font-medium text-slate-600">
                Sign in as
              </label>
              <input
                id="consent-account"
                type="email"
                data-autofocus
                placeholder="you@example.com"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && allow()}
                className={inputClass}
              />
            </div>
            <p className="mt-5 text-xs font-medium text-slate-600">This will allow Spendwise to:</p>
            <ul className="mt-2 space-y-2">
              {dest.scopes.map((scope) => (
                <li key={scope} className="flex items-start gap-2 text-sm text-slate-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  {scope}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Spendwise never sees your password and can only touch files it creates. You can revoke access at any time.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onCancel} className={buttonSecondary}>
                Cancel
              </button>
              <button type="button" onClick={allow} disabled={!valid} className={buttonPrimary}>
                Allow access
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
