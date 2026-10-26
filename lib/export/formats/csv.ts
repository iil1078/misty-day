import { expensesToCSV } from "../../csv";
import type { ExportDataset, ExportFormat } from "../types";

// BOM so Excel detects UTF-8.
const buildCSV = ({ rows }: ExportDataset) => "\uFEFF" + expensesToCSV(rows);

export const csvFormat: ExportFormat = {
  id: "csv",
  label: "CSV",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8",
  tagline: "Opens in Excel, Numbers & Sheets",
  encode: async (dataset) => new Blob([buildCSV(dataset)], { type: "text/csv;charset=utf-8" }),
  inspect: (dataset) => {
    const text = buildCSV(dataset);
    return { kind: "text", text, bytes: new TextEncoder().encode(text).length };
  },
};
