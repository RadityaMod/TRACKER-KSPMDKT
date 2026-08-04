/**
 * Logika status dan agregasi — murni, tanpa dependensi server.
 *
 * Sengaja DIPISAH dari reports.ts. File itu mengimpor source.ts yang memakai
 * `node:fs/promises`; kalau komponen klien mengimpor helper dari sana, modul
 * Node ikut terseret ke bundle browser dan build gagal. Semua yang perlu
 * dipakai bersama client & server tinggal di file ini.
 */

import type { Report } from "./schema";

export interface Metrics {
  total: number;
  baru: number;
  proses: number;
  selesai: number;
}

const RESOLVED = new Set(["selesai", "selesai ditangani", "ditutup"]);

export function isResolved(status: string): boolean {
  return RESOLVED.has(status.trim().toLowerCase());
}

export function isNew(status: string): boolean {
  return status.trim().toLowerCase() === "baru";
}

export function computeMetrics(reports: Report[]): Metrics {
  let baru = 0;
  let selesai = 0;

  for (const report of reports) {
    if (isNew(report.status)) baru++;
    else if (isResolved(report.status)) selesai++;
  }

  return {
    total: reports.length,
    baru,
    selesai,
    proses: reports.length - baru - selesai,
  };
}
