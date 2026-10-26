"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Expense } from "@/lib/types";
import { EXPORT_FORMATS, downloadBlob, summarize, type ExportOptions } from "@/lib/export";

export type ExportStage = "preparing" | "encoding" | "saving";

export type ExportJobState =
  | { status: "idle" }
  | { status: "running"; stage: ExportStage }
  | { status: "error"; message: string };

export interface ExportResult {
  filename: string;
  bytes: number;
  count: number;
}

/** Keeps the progress UI up long enough to be legible instead of flashing. */
const MIN_VISIBLE_MS = 650;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs an export as a small staged job. Each run gets an id; cancelling (or
 * unmounting) bumps the id so a stale run never triggers a download.
 */
export function useExportJob() {
  const [state, setState] = useState<ExportJobState>({ status: "idle" });
  const runId = useRef(0);

  useEffect(() => () => void runId.current++, []);

  const cancel = useCallback(() => {
    runId.current++;
    setState({ status: "idle" });
  }, []);

  const run = useCallback(
    async (rows: Expense[], options: ExportOptions, filename: string): Promise<ExportResult | null> => {
      const id = ++runId.current;
      const alive = () => runId.current === id;
      const started = performance.now();
      const format = EXPORT_FORMATS[options.format];

      try {
        setState({ status: "running", stage: "preparing" });
        await nextFrame();
        // Snapshot the rows so edits made mid-export can't change the output.
        const snapshot = rows.slice();
        const dataset = { rows: snapshot, summary: summarize(snapshot), options, generatedAt: new Date() };
        if (!alive()) return null;

        setState({ status: "running", stage: "encoding" });
        await nextFrame();
        const blob = await format.encode(dataset);
        if (!alive()) return null;

        setState({ status: "running", stage: "saving" });
        const remaining = MIN_VISIBLE_MS - (performance.now() - started);
        if (remaining > 0) await sleep(remaining);
        if (!alive()) return null;

        downloadBlob(blob, filename);
        setState({ status: "idle" });
        return { filename, bytes: blob.size, count: snapshot.length };
      } catch (e) {
        console.error(e);
        if (alive()) setState({ status: "error", message: `Couldn't generate the ${format.label} file. Please try again.` });
        return null;
      }
    },
    [],
  );

  return { state, run, cancel };
}
