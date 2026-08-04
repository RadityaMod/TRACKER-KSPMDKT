/**
 * Satu-satunya entry point publik untuk data laporan.
 *
 * Halaman dan komponen memanggil `getReports()` — bukan source, parser, atau
 * schema secara langsung.
 */

import { getSource } from "./source";
import { parseReports, SchemaError, type Report } from "./schema";

export type { Report } from "./schema";
export { SchemaError } from "./schema";

export interface ReportsResult {
  reports: Report[];
  label: string;
  /** Baris yang dilewati karena rusak — ditampilkan sebagai banner peringatan. */
  skipped: { line: number; reason: string }[];
  /** Kolom yang dipetakan tapi tidak ada di sumber — juga ditampilkan. */
  unmappedColumns: string[];
  /** Terisi bila Google Sheets gagal dan snapshot lokal dipakai. */
  fallbackReason?: string;
}

/*
 * CACHING — belum diaktifkan.
 *
 * Sumber sekarang adalah file lokal, jadi tiap pembacaan murah dan tidak ada
 * kuota API yang perlu dihemat. Saat pindah ke Google Sheets, ubah fungsi di
 * bawah menjadi:
 *
 *   export async function getReports(): Promise<ReportsResult> {
 *     "use cache";
 *     cacheTag("reports");
 *     cacheLife({ stale: 60, revalidate: 300, expire: 900 });
 *     ...
 *   }
 *
 * dan set `cacheComponents: true` di next.config.ts. Tombol refresh menjadi
 * Server Action yang memanggil `revalidateTag("reports", "max")`.
 *
 * PENTING saat itu: pengecekan auth harus tetap DI LUAR fungsi ber-cache.
 * Kalau `auth()` dipanggil di dalam 'use cache', hasil otorisasi satu user
 * akan ter-cache dan tersaji ke user berikutnya.
 */
export async function getReports(): Promise<ReportsResult> {
  const { rows, label, fallbackReason } = await getSource().read();
  const { reports, skipped, unmappedColumns } = parseReports(rows);
  return { reports, label, skipped, unmappedColumns, fallbackReason };
}

/*
 * Agregasi dan logika status ada di ./metrics.ts, BUKAN di sini.
 *
 * File ini mengimpor source.ts yang memakai `node:fs/promises`, jadi apa pun
 * yang diimpor komponen klien dari sini akan menyeret modul Node ke bundle
 * browser. Import computeMetrics / isNew / isResolved langsung dari
 * "@/lib/data/metrics".
 */
