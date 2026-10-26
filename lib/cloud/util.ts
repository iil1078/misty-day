export function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}

export async function sha256Hex(text: string): Promise<string | undefined> {
  // crypto.subtle only exists in secure contexts (https or localhost).
  if (typeof crypto === "undefined" || !crypto.subtle) return undefined;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "just now", "5 min ago", "in 2 days" … */
export function relativeTime(iso: string, now = Date.now()): string {
  // Callers pass a coarse, periodically refreshed clock; never let it lag behind real time,
  // or something that just happened would read as "in a moment".
  const diffSec = Math.round((new Date(iso).getTime() - Math.max(now, Date.now())) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return diffSec <= 0 ? "just now" : "in a moment";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function downloadText(content: string, filename: string, mimeType: string): void {
  // BOM for CSV so Excel picks up UTF-8.
  const body = mimeType.startsWith("text/csv") ? "﻿" + content : content;
  const url = URL.createObjectURL(new Blob([body], { type: mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
