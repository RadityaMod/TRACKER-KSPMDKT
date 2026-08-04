const TOKEN = 'ganti-token-rahasia';
const SHEET_NAME = 'Tracker Pelapor KSP Mendekat';
const START_ROW = 5;
const START_COLUMN = 1;
const COLUMN_COUNT = 14;

function doGet(e) {
  if (e.parameter.token !== TOKEN) {
    return jsonOutput({ error: 'Unauthorized' });
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const values = sheet
    .getRange(START_ROW, START_COLUMN, Math.max(lastRow - START_ROW + 1, 1), COLUMN_COUNT)
    .getDisplayValues();

  const headers = values[0] || [];
  const rows = values.slice(1).filter(row => row.some(Boolean));

  return jsonOutput({
    headers,
    rows,
    rowCount: rows.length,
    sourceLabel: `Google Sheets live · ${rows.length} entri`,
    updatedAt: new Date().toISOString(),
  });
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}