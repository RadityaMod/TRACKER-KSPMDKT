import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath =
  "C:\\Users\\Godsworth\\Downloads\\Semua KSP Mendekat\\OCA 720\\Tracker_Pelapor_OCA_KSP_Mendekat.xlsx";
const outputDir = path.resolve("..", "outputs", "source-inspection");

await fs.mkdir(outputDir, { recursive: true });

const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 30,
  tableMaxCellChars: 240,
});
await fs.writeFile(
  path.join(outputDir, "workbook-summary.ndjson"),
  summary.ndjson,
  "utf8",
);
console.log(summary.ndjson);

const sheetOverview = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 3000,
});
await fs.writeFile(
  path.join(outputDir, "sheet-overview.ndjson"),
  sheetOverview.ndjson,
  "utf8",
);

const sheetNames = [];
for (const line of sheetOverview.ndjson.split(/\r?\n/)) {
  if (!line.trim()) continue;
  try {
    const parsed = JSON.parse(line);
    const candidate =
      parsed.name ??
      parsed.sheetName ??
      parsed.payload?.name ??
      parsed.data?.name ??
      parsed.value?.name;
    if (candidate && !sheetNames.includes(candidate)) sheetNames.push(candidate);
  } catch {
    // Keep the broad workbook inspection as the fallback when NDJSON shape varies.
  }
}

if (sheetNames.length === 0) {
  const nameMatches = [
    ...sheetOverview.ndjson.matchAll(/"name"\s*:\s*"([^"]+)"/g),
  ];
  for (const match of nameMatches) {
    if (!sheetNames.includes(match[1])) sheetNames.push(match[1]);
  }
}

console.log(`SHEETS=${JSON.stringify(sheetNames)}`);

for (const sheetName of sheetNames) {
  const safeName = sheetName.replace(/[<>:"/\\|?*]+/g, "_");
  const region = await workbook.inspect({
    kind: "region",
    sheetId: sheetName,
    range: "A1:AZ500",
    maxChars: 30000,
    tableMaxRows: 100,
    tableMaxCols: 52,
    tableMaxCellChars: 300,
  });
  await fs.writeFile(
    path.join(outputDir, `${safeName}-region.ndjson`),
    region.ndjson,
    "utf8",
  );

  const errors = await workbook.inspect({
    kind: "match",
    sheetId: sheetName,
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    maxChars: 6000,
  });
  await fs.writeFile(
    path.join(outputDir, `${safeName}-errors.ndjson`),
    errors.ndjson,
    "utf8",
  );

  const preview = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(outputDir, `${safeName}-preview.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

