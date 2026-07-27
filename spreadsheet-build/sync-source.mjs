import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath =
  "C:\\Users\\Godsworth\\Downloads\\Semua KSP Mendekat\\OCA 720\\Tracker_Pelapor_OCA_KSP_Mendekat.xlsx";
const root = path.resolve("..");
const outputDir = path.join(root, "outputs", "ksp-mendekat");
const publicDataDir = path.join(root, "public", "data");
const sheetName = "Tracker Pelapor OCA";
const headerRow = 5;
const firstDataRow = 6;
const lastScanRow = 500;

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(publicDataDir, { recursive: true });

const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem(sheetName);
if (!sheet) throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);

const headers = sheet.getRange(`A${headerRow}:N${headerRow}`).values[0].map(String);
const scannedRows = sheet.getRange(`A${firstDataRow}:N${lastScanRow}`).values;
const rows = scannedRows.filter((row) =>
  row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""),
);

function maskIdentifier(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.includes("@")) {
    const [local, domain] = text.split("@");
    return `${local.slice(0, 1)}•••@${domain}`;
  }
  if (text.length <= 2) return "••";
  return `${text.slice(0, 1)}${"•".repeat(Math.min(4, text.length - 2))}${text.slice(-1)}`;
}

function maskPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return "••••";
  return `${digits.slice(0, 2)}•• •••• ${digits.slice(-4)}`;
}

function displayValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(value);
  }
  return String(value).trim();
}

const sanitizedRows = rows.map((row) =>
  row.map((cell, index) => {
    if (index === 4) return maskIdentifier(cell);
    if (index === 5) return maskPhone(cell);
    return displayValue(cell);
  }),
);

function csvCell(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const csv = [headers, ...sanitizedRows]
  .map((row) => row.map(csvCell).join(";"))
  .join("\n");
await fs.writeFile(
  path.join(publicDataDir, "laporan-ksp-mendekat.csv"),
  `${csv}\n`,
  "utf8",
);

rows.forEach((_, index) => {
  const excelRow = firstDataRow + index;
  sheet.getRange(`E${excelRow}`).values = [[sanitizedRows[index][4]]];
  sheet.getRange(`F${excelRow}`).values = [[sanitizedRows[index][5]]];
});
sheet.getRange("A2").values = [[
  `Total pelapor tercatat: ${rows.length} · Salinan dashboard dengan kontak tersamar`,
]];

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
const outputWorkbookPath = path.join(
  outputDir,
  "Tracker_Pelapor_OCA_KSP_Mendekat_Dashboard.xlsx",
);
await xlsx.save(outputWorkbookPath);
await xlsx.save(
  path.join(publicDataDir, "Tracker_Pelapor_OCA_KSP_Mendekat_Dashboard.xlsx"),
);

const preview = await workbook.render({
  sheetName,
  range: `A1:N${Math.max(firstDataRow, firstDataRow + rows.length - 1)}`,
  scale: 1,
  format: "png",
});
await fs.writeFile(
  path.join(outputDir, "Tracker_Pelapor_OCA_KSP_Mendekat_Dashboard_preview.png"),
  new Uint8Array(await preview.arrayBuffer()),
);

const verification = await workbook.inspect({
  kind: "table",
  sheetId: sheetName,
  range: `A1:N${Math.max(firstDataRow, firstDataRow + rows.length - 1)}`,
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 14,
  maxChars: 12000,
});
await fs.writeFile(
  path.join(outputDir, "dashboard-workbook-verification.ndjson"),
  verification.ndjson,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      sourcePath,
      sheetName,
      range: `A${headerRow}:N${firstDataRow + rows.length - 1}`,
      rowCount: rows.length,
      headers,
      statuses: [...new Set(sanitizedRows.map((row) => row[11]).filter(Boolean))],
      outputWorkbookPath,
    },
    null,
    2,
  ),
);

