"use client";

import type { ExportArtifact } from "@/lib/cloud/types";
import { byteLength, formatBytes } from "@/lib/cloud/util";

/** File card + first lines of the generated output. */
export function ArtifactPreview({ artifact, lines = 12 }: { artifact: ExportArtifact; lines?: number }) {
  const all = artifact.content.split(/\r?\n/);
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2 text-xs">
        <span className="truncate font-mono font-medium text-slate-700">{artifact.filename}</span>
        <span className="shrink-0 tabular-nums text-slate-500">
          {artifact.rowCount.toLocaleString()} records · {formatBytes(byteLength(artifact.content))}
        </span>
      </div>
      <pre className="max-h-56 overflow-auto bg-slate-950 px-3 py-2.5 font-mono text-[11.5px] leading-5 text-slate-200">
        {all.slice(0, lines).join("\n")}
        {all.length > lines && <span className="text-slate-500">{`\n⋯ ${all.length - lines} more lines`}</span>}
      </pre>
    </div>
  );
}
