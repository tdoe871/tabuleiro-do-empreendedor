// CSV for exports (opens in Excel and Google Sheets).

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  // A cell starting with = + - @ would run as a formula in Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// CSV with a UTF-8 BOM so Excel opens accents correctly.
export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
