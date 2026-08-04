#!/usr/bin/env node
/**
 * Tulis .env.local dari file kunci service account.
 *
 * Menempel JSON service account ke .env secara manual mudah salah: kuncinya
 * memuat newline sungguhan yang harus jadi literal \n, dan satu tanda kutip
 * yang meleset membuat pesan errornya membingungkan. Skrip ini melakukannya
 * dengan benar.
 *
 * Pemakaian:
 *   node scripts/setup-env.mjs <path-ke-kunci.json> <SHEET_ID> [SHEET_RANGE]
 *
 * Isi kunci TIDAK pernah ditampilkan ke layar.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const [, , keyPath, sheetId, sheetRange] = process.argv;

if (!keyPath || !sheetId) {
  console.error(
    "Pemakaian: node scripts/setup-env.mjs <path-ke-kunci.json> <SHEET_ID> [SHEET_RANGE]",
  );
  process.exit(1);
}

if (!existsSync(keyPath)) {
  console.error(`File kunci tidak ditemukan: ${keyPath}`);
  process.exit(1);
}

let key;
try {
  key = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  console.error(`File itu bukan JSON yang valid: ${keyPath}`);
  process.exit(1);
}

if (!key.client_email || !key.private_key) {
  console.error(
    "JSON tidak memuat client_email / private_key. Pastikan yang diunduh " +
      "adalah kunci service account, bukan file OAuth client.",
  );
  process.exit(1);
}

const target = path.join(process.cwd(), ".env.local");
if (existsSync(target)) {
  console.error(`.env.local sudah ada. Hapus atau ganti namanya dulu: ${target}`);
  process.exit(1);
}

// JSON.stringify menghasilkan satu baris dengan newline sebagai literal \n —
// persis bentuk yang dibaca readGoogleSheetConfig().
const oneLine = JSON.stringify(key);

writeFileSync(
  target,
  [
    `SHEET_ID=${sheetId}`,
    `SHEET_RANGE=${sheetRange ? JSON.stringify(sheetRange) : "Sheet1!A:N"}`,
    `GOOGLE_SERVICE_ACCOUNT_JSON='${oneLine}'`,
    `ALLOW_LOCAL_FALLBACK=false`,
    "",
  ].join("\n"),
  "utf8",
);

console.log(`✓ .env.local ditulis.`);
console.log(`  Service account : ${key.client_email}`);
console.log(`  Sheet ID        : ${sheetId}`);
console.log(`  Range           : ${sheetRange ?? "Sheet1!A:N"}`);
console.log("");
console.log("Langkah berikutnya:");
console.log(`  1. Bagikan Google Sheet ke ${key.client_email} sebagai Viewer.`);
console.log("  2. Restart: npm run dev");
