import type { Category, Expense } from "../types";

export type ExportFormatId = "csv" | "json" | "pdf";

export type ExportSort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

/** Everything the user can configure in the export drawer. */
export interface ExportOptions {
  format: ExportFormatId;
  /** Inclusive YYYY-MM-DD bounds; empty string = unbounded. */
  from: string;
  to: string;
  categories: Category[];
  keyword: string;
  sort: ExportSort;
  /** Base filename without extension. Empty = use the generated default. */
  filename: string;
}

export interface ExportSummary {
  count: number;
  total: number;
  average: number;
  earliest: string | null;
  latest: string | null;
  byCategory: { category: Category; count: number; total: number }[];
}

/** The resolved, filtered data handed to a format encoder. */
export interface ExportDataset {
  rows: Expense[];
  summary: ExportSummary;
  options: ExportOptions;
  generatedAt: Date;
}

/** What the preview panel shows about the file that will be produced. */
export type ExportOutputInfo = { kind: "text"; text: string; bytes: number } | { kind: "pages"; pages: number };

export interface ExportFormat {
  id: ExportFormatId;
  label: string;
  extension: string;
  mimeType: string;
  tagline: string;
  /** Encode the dataset. May yield to the event loop for large inputs. */
  encode: (dataset: ExportDataset) => Promise<Blob>;
  /** Cheap, synchronous description of the output for the live preview. */
  inspect: (dataset: ExportDataset) => ExportOutputInfo;
}
