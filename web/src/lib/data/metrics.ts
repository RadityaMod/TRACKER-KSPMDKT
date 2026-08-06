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

export interface Insights {
  total: number;
  /** Jumlah per kanal, terbanyak dulu. */
  kanal: { label: string; count: number }[];
  /** Kategori aduan terbanyak. */
  kategoriTeratas: { label: string; count: number } | null;
  /** Entri yang catatannya minta dicek manusia. */
  perluVerifikasi: number;
  /** Jumlah nilai unik pada Status Tindak Lanjut. */
  ragamStatus: number;
}

function tally(values: string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const label = raw.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "id-ID"));
}

/**
 * Angka ringkas yang benar-benar membawa informasi.
 *
 * KPI status (Baru/Proses/Selesai) tidak berguna selama seluruh entri masih
 * berstatus "Baru" — tiga dari empat tile-nya permanen nol. Ringkasan ini
 * memberi potongan yang bervariasi di data nyata: sebaran kanal, kategori
 * terbanyak, dan berapa entri yang perlu diverifikasi manusia.
 */
export function computeInsights(reports: Report[]): Insights {
  return {
    total: reports.length,
    kanal: tally(reports.map((r) => r.kanal)),
    kategoriTeratas: tally(reports.map((r) => r.kategori))[0] ?? null,
    perluVerifikasi: reports.filter((r) => r.perluVerifikasi).length,
    ragamStatus: new Set(
      reports.map((r) => r.status.trim()).filter(Boolean),
    ).size,
  };
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
