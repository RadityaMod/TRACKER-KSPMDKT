import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
test("static dashboard is a simple sheet-backed table",async()=>{const html=await readFile(new URL("../public/dashboard.html",import.meta.url),"utf8");const csv=await readFile(new URL("../public/data/laporan-ksp-mendekat.csv",import.meta.url),"utf8");assert.match(html,/Tracking Laporan KSP Mendekat/);assert.match(html,/Google Sheets/);assert.match(html,/<table>/);assert.match(html,/fetch\("\/data\/laporan-ksp-mendekat\.csv"\)/);assert.doesNotMatch(html,/sidebar|modal|timeline|dashboard-grid/);assert.equal(csv.trim().split(/\r?\n/).length,7);assert.match(csv,/ID Laporan;Tanggal Masuk;Nama Pelapor/)});
