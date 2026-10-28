/**
 * Saves a table in one of the five export formats, in the browser. The heavy
 * libraries (PDF, Excel) are loaded only when their button is used.
 */

import { cleanText, toCsv, toLatin1, toSql, toTxt } from "./datatable";

export type ExportFormat = "pdf" | "xlsx" | "csv" | "txt" | "sql";

export interface ExportTable {
  /** File and SQL table name, e.g. "commandes". */
  name: string;
  /** Shown as the PDF title. */
  title: string;
  headers: string[];
  rows: string[][];
}

const MIME: Record<Exclude<ExportFormat, "pdf" | "xlsx">, string> = {
  csv: "text/csv;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  sql: "application/sql;charset=utf-8",
};

/** "commandes-2026-10-28" */
export function exportFileName(name: string, format: ExportFormat, now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  const safe = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "export";
  return `${safe}-${stamp}.${format}`;
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportTable(format: ExportFormat, table: ExportTable): Promise<void> {
  const filename = exportFileName(table.name, format);

  if (format === "csv") {
    // The BOM lets Excel read the accents of a UTF-8 CSV correctly.
    download(new Blob(["﻿", toCsv(table.headers, table.rows)], { type: MIME.csv }), filename);
    return;
  }

  if (format === "txt") {
    download(new Blob([toTxt(table.headers, table.rows)], { type: MIME.txt }), filename);
    return;
  }

  if (format === "sql") {
    download(new Blob([toSql(table.name, table.headers, table.rows)], { type: MIME.sql }), filename);
    return;
  }

  if (format === "xlsx") {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    const header = table.headers.map((value) => ({ value, fontWeight: "bold" as const }));
    const body = table.rows.map((row) => row.map((value) => ({ value: cleanText(value) })));
    const blob = await writeExcelFile([header, ...body]).toBlob();
    download(blob, filename);
    return;
  }

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--gold").trim() || "#ee9e0b";
  const pdf = new jsPDF({ orientation: table.headers.length > 5 ? "landscape" : "portrait", unit: "pt", format: "a4" });

  pdf.setFontSize(14);
  pdf.text(toLatin1(table.title), 40, 40);
  autoTable(pdf, {
    startY: 56,
    head: [table.headers.map(toLatin1)],
    body: table.rows.map((row) => row.map(toLatin1)),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: accent, textColor: 255 },
    margin: { left: 40, right: 40 },
  });
  pdf.save(filename);
}
