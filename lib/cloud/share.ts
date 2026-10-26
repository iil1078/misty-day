import { CATEGORIES, type Category, type Expense } from "../types";

/*
 * Snapshot links carry their data in the URL fragment (#...), which browsers
 * never send to a server. The payload is compact JSON, deflated and base64url
 * encoded, so a link works anywhere without a backend.
 */

export interface SnapshotPayload {
  v: 1;
  title: string;
  period: string;
  createdAt: string;
  expiresAt: string | null;
  redacted: boolean;
  count: number;
  totalCents: number;
  /** [category, cents, count] */
  categories: [Category, number, number][];
  /** [YYYY-MM, cents] */
  months: [string, number][];
  /** [date, categoryIndex, cents, description?] — omitted for summary-only links. */
  rows?: [string, number, number, string?][];
}

export function buildSnapshot(
  expenses: Expense[],
  opts: { title: string; period: string; expiresAt: string | null; redacted: boolean; includeRows: boolean },
): SnapshotPayload {
  const cents = (n: number) => Math.round(n * 100);
  const cats = new Map<Category, [number, number]>();
  const months = new Map<string, number>();
  for (const e of expenses) {
    const c = cats.get(e.category) ?? [0, 0];
    cats.set(e.category, [c[0] + cents(e.amount), c[1] + 1]);
    const k = e.date.slice(0, 7);
    months.set(k, (months.get(k) ?? 0) + cents(e.amount));
  }
  return {
    v: 1,
    title: opts.title,
    period: opts.period,
    createdAt: new Date().toISOString(),
    expiresAt: opts.expiresAt,
    redacted: opts.redacted,
    count: expenses.length,
    totalCents: expenses.reduce((acc, e) => acc + cents(e.amount), 0),
    categories: CATEGORIES.filter((c) => cats.has(c)).map((c) => [c, ...cats.get(c)!]),
    months: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)),
    rows: opts.includeRows
      ? expenses.map((e) => {
          const row: [string, number, number, string?] = [e.date, CATEGORIES.indexOf(e.category), cents(e.amount)];
          if (!opts.redacted) row.push(e.description);
          return row;
        })
      : undefined,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** "z" prefix = deflate-raw compressed, "u" = uncompressed fallback for older browsers. */
export async function encodeSnapshot(payload: SnapshotPayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream === "undefined") return "u" + toBase64Url(json);
  return "z" + toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export async function decodeSnapshot(token: string): Promise<SnapshotPayload> {
  const kind = token[0];
  const bytes = fromBase64Url(token.slice(1));
  let json: Uint8Array;
  if (kind === "z") json = await pipe(bytes, new DecompressionStream("deflate-raw"));
  else if (kind === "u") json = bytes;
  else throw new Error("Unrecognised link format");
  const data = JSON.parse(new TextDecoder().decode(json)) as SnapshotPayload;
  if (data?.v !== 1 || !Array.isArray(data.categories) || typeof data.totalCents !== "number") {
    throw new Error("Invalid snapshot");
  }
  return data;
}

export function shareUrl(origin: string, token: string): string {
  return `${origin}/share#${token}`;
}
