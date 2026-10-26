import { csvFormat } from "./formats/csv";
import { jsonFormat } from "./formats/json";
import { pdfFormat } from "./formats/pdf";
import type { ExportFormat, ExportFormatId } from "./types";

export * from "./types";
export * from "./query";

/** Format registry — add a new encoder here and it appears in the export drawer. */
export const EXPORT_FORMATS: Record<ExportFormatId, ExportFormat> = {
  csv: csvFormat,
  json: jsonFormat,
  pdf: pdfFormat,
};

export const EXPORT_FORMAT_ORDER: ExportFormatId[] = ["csv", "json", "pdf"];

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
