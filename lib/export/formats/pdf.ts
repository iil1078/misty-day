import { CATEGORY_STYLES } from "../../types";
import { formatCurrency, formatDate, formatMonthKey } from "../../format";
import { describeFilters } from "../query";
import type { ExportDataset, ExportFormat } from "../types";

/*
 * A small, dependency-free PDF 1.4 writer tailored to the expense report.
 * It uses the standard Helvetica fonts (no embedding needed) with WinAnsi
 * encoding, and lays out a header, summary tiles, a category breakdown and a
 * paginated transaction table with repeated column headers and page footers.
 */

const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_SPACE = 40;
const ROW_H = 18;

const COLORS = {
  brand: "#4f46e5",
  ink: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  rule: "#e2e8f0",
  zebra: "#f8fafc",
  tile: "#f1f5f9",
  headerRow: "#eef2ff",
  white: "#ffffff",
  onBrandMuted: "#c7d2fe",
};

// Helvetica glyph widths (1/1000 em) for ASCII 32..126, from the standard AFM.
// prettier-ignore
const HELVETICA_WIDTHS = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,
  278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,
  611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,
  556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,
];

// Characters outside Latin-1 that WinAnsiEncoding can still represent.
const WIN_ANSI_EXTRAS: Record<string, number> = {
  "€": 0x80, "…": 0x85, "•": 0x95, "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "™": 0x99,
};

type Font = "regular" | "bold";

/** Convert to a WinAnsi byte string; unrepresentable characters (e.g. emoji) become "?". */
function toWinAnsi(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x20 && code <= 0x7e) out += ch;
    else if (code >= 0xa0 && code <= 0xff) out += ch;
    else if (WIN_ANSI_EXTRAS[ch] !== undefined) out += String.fromCharCode(WIN_ANSI_EXTRAS[ch]);
    else if (ch === "\t" || ch === "\n" || ch === "\r") out += " ";
    else out += "?";
  }
  return out;
}

function textWidth(winAnsi: string, size: number, font: Font): number {
  let units = 0;
  for (let i = 0; i < winAnsi.length; i++) {
    const c = winAnsi.charCodeAt(i);
    units += c >= 32 && c <= 126 ? HELVETICA_WIDTHS[c - 32] : c === 0x85 ? 1000 : 556;
  }
  // Bold glyphs are slightly wider on average; good enough for alignment and truncation.
  return (units * size * (font === "bold" ? 1.06 : 1)) / 1000;
}

function truncate(winAnsi: string, maxWidth: number, size: number, font: Font): string {
  if (textWidth(winAnsi, size, font) <= maxWidth) return winAnsi;
  const ellipsis = String.fromCharCode(0x85);
  let s = winAnsi;
  while (s.length > 0 && textWidth(s + ellipsis, size, font) > maxWidth) s = s.slice(0, -1);
  return s.trimEnd() + ellipsis;
}

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => num(v / 255)).join(" ");
}

function num(n: number): string {
  return Number(n.toFixed(2)).toString();
}

function escapePdfString(s: string): string {
  return s.replace(/[\\()]/g, (m) => `\\${m}`);
}

/** A page's drawing operations, using top-left based coordinates for convenience. */
class Page {
  ops: string[] = [];

  rect(x: number, top: number, w: number, h: number, color: string) {
    this.ops.push(`${rgb(color)} rg ${num(x)} ${num(PAGE_H - top - h)} ${num(w)} ${num(h)} re f`);
  }

  line(x1: number, x2: number, y: number, color: string, width = 0.75) {
    this.ops.push(`${rgb(color)} RG ${num(width)} w ${num(x1)} ${num(PAGE_H - y)} m ${num(x2)} ${num(PAGE_H - y)} l S`);
  }

  /** Draw text with its baseline at `baseline` (measured from the top of the page). */
  text(
    raw: string,
    x: number,
    baseline: number,
    opts: { size?: number; font?: Font; color?: string; align?: "left" | "right"; maxWidth?: number } = {},
  ) {
    const { size = 9, font = "regular", color = COLORS.ink, align = "left", maxWidth } = opts;
    let s = toWinAnsi(raw);
    if (maxWidth) s = truncate(s, maxWidth, size, font);
    const left = align === "right" ? x - textWidth(s, size, font) : x;
    this.ops.push(
      `BT /${font === "bold" ? "F2" : "F1"} ${size} Tf ${rgb(color)} rg ${num(left)} ${num(PAGE_H - baseline)} Td (${escapePdfString(s)}) Tj ET`,
    );
  }
}

const COLUMNS = {
  date: MARGIN + 8,
  category: MARGIN + 92,
  description: MARGIN + 196,
  amountRight: PAGE_W - MARGIN - 8,
};
const DESCRIPTION_W = COLUMNS.amountRight - 96 - COLUMNS.description;

function drawTableHeader(page: Page, top: number): number {
  page.rect(MARGIN, top, CONTENT_W, ROW_H + 2, COLORS.headerRow);
  const baseline = top + 13;
  const style = { size: 8, font: "bold" as const, color: COLORS.brand };
  page.text("DATE", COLUMNS.date, baseline, style);
  page.text("CATEGORY", COLUMNS.category, baseline, style);
  page.text("DESCRIPTION", COLUMNS.description, baseline, style);
  page.text("AMOUNT", COLUMNS.amountRight, baseline, { ...style, align: "right" });
  return top + ROW_H + 2;
}

function drawReportHeader(page: Page, dataset: ExportDataset): number {
  const { range, categories } = describeFilters(dataset.options);
  page.rect(0, 0, PAGE_W, 96, COLORS.brand);
  page.text("Expense Report", MARGIN, 46, { size: 22, font: "bold", color: COLORS.white });
  page.text(`${range}  ·  ${categories}`, MARGIN, 68, {
    size: 10,
    color: COLORS.onBrandMuted,
    maxWidth: CONTENT_W - 170,
  });
  page.text("Spendwise", PAGE_W - MARGIN, 46, { size: 12, font: "bold", color: COLORS.white, align: "right" });
  page.text(
    `Generated ${dataset.generatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    PAGE_W - MARGIN,
    68,
    { size: 9, color: COLORS.onBrandMuted, align: "right" },
  );
  return 96 + 28;
}

/** Compact period label that fits a tile: the year moves into the label when shared. */
function periodTile(earliest: string | null, latest: string | null): [string, string] {
  if (!earliest || !latest) return ["PERIOD", "—"];
  const md = (iso: string) => formatDate(iso).replace(/, \d{4}$/, "");
  const [y1, y2] = [earliest.slice(0, 4), latest.slice(0, 4)];
  if (earliest === latest) return [`PERIOD · ${y1}`, md(earliest)];
  if (y1 === y2) return [`PERIOD · ${y1}`, `${md(earliest)} – ${md(latest)}`];
  const my = (iso: string) => formatMonthKey(iso.slice(0, 7), true);
  return ["PERIOD", `${my(earliest)} – ${my(latest)}`];
}

function drawSummaryTiles(page: Page, dataset: ExportDataset, top: number): number {
  const { summary } = dataset;
  const gap = 12;
  const tileW = (CONTENT_W - gap * 3) / 4;
  const tiles: [string, string][] = [
    ["RECORDS", summary.count.toLocaleString("en-US")],
    ["TOTAL SPENT", formatCurrency(summary.total)],
    ["AVERAGE", formatCurrency(summary.average)],
    periodTile(summary.earliest, summary.latest),
  ];
  tiles.forEach(([label, value], i) => {
    const x = MARGIN + i * (tileW + gap);
    page.rect(x, top, tileW, 54, COLORS.tile);
    page.text(label, x + 12, top + 19, { size: 7.5, font: "bold", color: COLORS.muted });
    page.text(value, x + 12, top + 40, {
      size: i === 3 ? 11 : 15,
      font: "bold",
      maxWidth: tileW - 20,
    });
  });
  return top + 54 + 30;
}

function drawCategoryBreakdown(page: Page, dataset: ExportDataset, top: number): number {
  const { summary } = dataset;
  page.text("Spending by category", MARGIN, top, { size: 12, font: "bold" });
  let y = top + 14;
  const barX = MARGIN + 200;
  const barW = CONTENT_W - 200 - 150;
  for (const row of summary.byCategory) {
    const share = summary.total > 0 ? row.total / summary.total : 0;
    const baseline = y + 12;
    page.rect(MARGIN, y + 5, 8, 8, CATEGORY_STYLES[row.category].color);
    page.text(row.category, MARGIN + 16, baseline, { size: 9.5 });
    page.text(`${row.count} item${row.count === 1 ? "" : "s"}`, MARGIN + 190, baseline, {
      size: 8.5,
      color: COLORS.muted,
      align: "right",
    });
    page.rect(barX, y + 6, barW, 6, COLORS.tile);
    if (share > 0) page.rect(barX, y + 6, Math.max(2, barW * share), 6, CATEGORY_STYLES[row.category].color);
    page.text(`${(share * 100).toFixed(1)}%`, barX + barW + 46, baseline, {
      size: 8.5,
      color: COLORS.muted,
      align: "right",
    });
    page.text(formatCurrency(row.total), PAGE_W - MARGIN, baseline, { size: 9.5, font: "bold", align: "right" });
    y += ROW_H;
  }
  page.line(MARGIN, PAGE_W - MARGIN, y + 4, COLORS.rule);
  return y + 32;
}

function layout(dataset: ExportDataset): Page[] {
  const pages: Page[] = [];
  let page = new Page();
  pages.push(page);

  let y = drawReportHeader(page, dataset);
  y = drawSummaryTiles(page, dataset, y);
  y = drawCategoryBreakdown(page, dataset, y);

  const bottom = PAGE_H - MARGIN - FOOTER_SPACE + 16;
  const startTable = () => {
    page.text("Transactions", MARGIN, y, { size: 12, font: "bold" });
    y = drawTableHeader(page, y + 10);
  };
  // Don't strand the table heading at the very bottom of page one.
  if (y + 10 + ROW_H * 4 > bottom) {
    page = new Page();
    pages.push(page);
    y = MARGIN;
  }
  startTable();

  for (let i = 0; i < dataset.rows.length; i++) {
    if (y + ROW_H > bottom) {
      page = new Page();
      pages.push(page);
      y = drawTableHeader(page, MARGIN);
    }
    const e = dataset.rows[i];
    if (i % 2 === 1) page.rect(MARGIN, y, CONTENT_W, ROW_H, COLORS.zebra);
    const baseline = y + 12.5;
    page.text(formatDate(e.date), COLUMNS.date, baseline);
    page.rect(COLUMNS.category, y + 6.5, 5, 5, CATEGORY_STYLES[e.category].color);
    page.text(e.category, COLUMNS.category + 10, baseline, { color: COLORS.muted });
    page.text(e.description, COLUMNS.description, baseline, { maxWidth: DESCRIPTION_W });
    page.text(formatCurrency(e.amount), COLUMNS.amountRight, baseline, { align: "right" });
    y += ROW_H;
  }

  if (y + ROW_H + 6 > bottom) {
    page = new Page();
    pages.push(page);
    y = MARGIN;
  }
  page.line(MARGIN, PAGE_W - MARGIN, y + 2, COLORS.ink, 1);
  page.text(`Total · ${dataset.summary.count.toLocaleString("en-US")} records`, COLUMNS.date, y + 16, {
    size: 9.5,
    font: "bold",
  });
  page.text(formatCurrency(dataset.summary.total), COLUMNS.amountRight, y + 16, { size: 9.5, font: "bold", align: "right" });

  pages.forEach((p, i) => {
    const baseline = PAGE_H - MARGIN + 14;
    p.line(MARGIN, PAGE_W - MARGIN, baseline - 12, COLORS.rule);
    p.text("Spendwise · Expense Report", MARGIN, baseline, { size: 8, color: COLORS.faint });
    p.text(`Page ${i + 1} of ${pages.length}`, PAGE_W - MARGIN, baseline, {
      size: 8,
      color: COLORS.faint,
      align: "right",
    });
  });
  return pages;
}

function pdfDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Serialise pages into PDF bytes. Every string here is single-byte, so length == byte length. */
function serialise(pages: Page[], generatedAt: Date): Uint8Array {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body); // object number = index + 1

  const pageRefs = pages.map((_, i) => `${6 + i * 2} 0 R`).join(" ");
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  add(`<< /Title (Expense Report) /Producer (Spendwise) /CreationDate (${pdfDate(generatedAt)}) >>`);
  pages.forEach((page, i) => {
    const contentRef = 7 + i * 2;
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`,
    );
    const stream = page.ops.join("\n");
    add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let out = "%PDF-1.4\n%âãÏÓ\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i);
  return bytes;
}

export function buildPDF(dataset: ExportDataset): Uint8Array {
  return serialise(layout(dataset), dataset.generatedAt);
}

/** Exact page count for the preview. Layout is cheap; serialisation is skipped. */
function countPdfPages(dataset: ExportDataset): number {
  return layout(dataset).length;
}

export const pdfFormat: ExportFormat = {
  id: "pdf",
  label: "PDF",
  extension: "pdf",
  mimeType: "application/pdf",
  tagline: "Print-ready report with charts & totals",
  encode: async (dataset) => new Blob([buildPDF(dataset)], { type: "application/pdf" }),
  inspect: (dataset) => ({ kind: "pages", pages: countPdfPages(dataset) }),
};
