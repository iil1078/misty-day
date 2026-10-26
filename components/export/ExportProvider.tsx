"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { DEFAULT_EXPORT_OPTIONS, type ExportOptions } from "@/lib/export";
import { ExportDrawer } from "./ExportDrawer";

interface ExportContextValue {
  /** Open the export drawer, optionally pre-filled (e.g. with a page's active filters). */
  openExport: (preset?: Partial<ExportOptions>) => void;
}

const ExportContext = createContext<ExportContextValue | null>(null);

// Not under the "expense-tracker:" prefix, so cross-tab sync doesn't reload expenses on save.
const PREFS_KEY = "spendwise:export-prefs:v1";
type ExportPrefs = Pick<ExportOptions, "format" | "sort">;

function loadPrefs(): Partial<ExportPrefs> {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ExportPrefs>) : {};
    return {
      ...(["csv", "json", "pdf"].includes(parsed.format as string) ? { format: parsed.format } : {}),
      ...(["date-desc", "date-asc", "amount-desc", "amount-asc"].includes(parsed.sort as string) ? { sort: parsed.sort } : {}),
    };
  } catch {
    return {};
  }
}

function savePrefs(options: ExportOptions) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ format: options.format, sort: options.sort } satisfies ExportPrefs));
  } catch {
    /* preferences are best-effort */
  }
}

export function ExportProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ id: number; initial: ExportOptions } | null>(null);
  const nextId = useRef(1);

  const openExport = useCallback((preset: Partial<ExportOptions> = {}) => {
    setSession({ id: nextId.current++, initial: { ...DEFAULT_EXPORT_OPTIONS, ...loadPrefs(), ...preset } });
  }, []);
  const close = useCallback(() => setSession(null), []);

  return (
    <ExportContext.Provider value={{ openExport }}>
      {children}
      {session && (
        // Keyed per session so every open starts from a clean slate.
        <ExportDrawer key={session.id} open initial={session.initial} onClose={close} onExported={savePrefs} />
      )}
    </ExportContext.Provider>
  );
}

export function useExport(): ExportContextValue {
  const ctx = useContext(ExportContext);
  if (!ctx) throw new Error("useExport must be used within ExportProvider");
  return ctx;
}
