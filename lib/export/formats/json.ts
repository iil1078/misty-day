import { describeFilters } from "../query";
import type { ExportDataset, ExportFormat } from "../types";

export function buildJSON({ rows, summary, options, generatedAt }: ExportDataset): string {
  const filters = describeFilters(options);
  return JSON.stringify(
    {
      $schema: "spendwise.expense-export/v1",
      generatedAt: generatedAt.toISOString(),
      filters: {
        from: options.from || null,
        to: options.to || null,
        categories: options.categories,
        keyword: options.keyword.trim() || null,
        sort: options.sort,
        description: `${filters.range} · ${filters.categories}`,
      },
      summary: {
        count: summary.count,
        total: summary.total,
        average: summary.average,
        earliest: summary.earliest,
        latest: summary.latest,
        byCategory: summary.byCategory,
      },
      expenses: rows.map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        description: e.description,
        amount: e.amount,
      })),
    },
    null,
    2,
  );
}

export const jsonFormat: ExportFormat = {
  id: "json",
  label: "JSON",
  extension: "json",
  mimeType: "application/json",
  tagline: "Structured data with summary metadata",
  encode: async (dataset) => new Blob([buildJSON(dataset)], { type: "application/json" }),
  inspect: (dataset) => {
    const text = buildJSON(dataset);
    return { kind: "text", text, bytes: new TextEncoder().encode(text).length };
  },
};
