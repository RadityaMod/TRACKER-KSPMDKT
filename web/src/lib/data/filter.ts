/**
 * Cari, filter, dan sortir — fungsi murni, sengaja di luar komponen supaya
 * bisa diuji tanpa render.
 */

import type { Report } from "./schema";

export type SortKey =
  | "status"
  | "kanal"
  | "kategori"
  | "masuk"
  | "update"
  | null;
export type SortDirection = "asc" | "desc" | null;

export interface Query {
  search: string;
  status: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

/**
 * Urutan awal: tanggal masuk, yang terbaru di atas.
 *
 * Sebelumnya sortKey null, yang berarti "pakai urutan baris sheet" — urutan
 * itu menaik menurut nomor entri, sehingga laporan terlama justru muncul
 * paling atas dan yang baru masuk terkubur di dasar.
 */
export const EMPTY_QUERY: Query = {
  search: "",
  status: "",
  sortKey: "masuk",
  sortDirection: "desc",
};

/** Urutan apa adanya dari sumber data — dipakai tombol "Hapus filter". */
export const SOURCE_ORDER: Query = {
  search: "",
  status: "",
  sortKey: null,
  sortDirection: null,
};

/** Field yang ikut dicari. Sengaja eksplisit, bukan join seluruh objek. */
function haystack(report: Report): string {
  return [
    report.no,
    report.namaPelapor,
    report.alamat,
    report.kategori,
    report.kanal,
    report.ringkasan,
    report.catatan,
    report.status,
    report.statusPelapor,
    report.noTelpon,
    report.kontakWa,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Nilai yang dibandingkan saat sortir.
 *
 * Tanggal dikembalikan sebagai DateOnly ("YYYY-MM-DD"), bukan teks tampilan
 * "DD/MM/YYYY". Format YYYY-MM-DD urut secara leksikografis sama persis
 * dengan urutan kronologisnya; mengurutkan "DD/MM/YYYY" sebagai teks akan
 * mengelompokkan semua tanggal 01 lebih dulu, lintas bulan dan tahun.
 */
function sortValue(report: Report, key: Exclude<SortKey, null>): string {
  switch (key) {
    case "masuk":
      return report.tanggalMasuk ?? "";
    case "update":
      // Entri tanpa tanggal update diperlakukan memakai tanggal masuknya,
      // supaya tidak terlempar ke dasar seolah tidak pernah ada aktivitas.
      return report.tanggalUpdate ?? report.tanggalMasuk ?? "";
    case "status":
      return report.status.trim().toLocaleLowerCase("id-ID");
    case "kanal":
      return report.kanal.trim().toLocaleLowerCase("id-ID");
    case "kategori":
      return report.kategori.trim().toLocaleLowerCase("id-ID");
  }
}

export function applyQuery(reports: Report[], query: Query): Report[] {
  const search = query.search.trim().toLowerCase();

  const filtered = reports.filter((report) => {
    if (query.status && report.status !== query.status) return false;
    if (search && !haystack(report).includes(search)) return false;
    return true;
  });

  if (!query.sortKey || !query.sortDirection) return filtered;

  const key = query.sortKey;
  const direction = query.sortDirection === "asc" ? 1 : -1;

  // Index asli dipakai sebagai tie-breaker supaya urutan stabil.
  return filtered
    .map((report, index) => ({ report, index }))
    .sort((a, b) => {
      const left = sortValue(a.report, key);
      const right = sortValue(b.report, key);

      // Nilai kosong selalu di bawah, tidak peduli arah sortir.
      if (!left || !right) {
        if (left === right) return a.index - b.index;
        return left ? -1 : 1;
      }

      const compared = left.localeCompare(right, "id-ID", {
        numeric: true,
        sensitivity: "base",
      });
      return compared ? compared * direction : a.index - b.index;
    })
    .map((entry) => entry.report);
}

/**
 * Siklus sortir: asc → desc → mati.
 *
 * Sengaja memakai nama field yang SAMA dengan Query (`sortKey`/`sortDirection`)
 * supaya hasilnya bisa di-spread langsung ke state tanpa pemetaan ulang.
 * Versi sebelumnya mengembalikan `{key, direction}` lalu di-spread ke Query —
 * hasilnya properti asing yang diabaikan diam-diam, dan sortir tidak pernah
 * berubah meski unit test `nextSort` sendiri lulus.
 */
export function nextSort(
  current: Pick<Query, "sortKey" | "sortDirection">,
  key: Exclude<SortKey, null>,
): Pick<Query, "sortKey" | "sortDirection"> {
  if (current.sortKey !== key) return { sortKey: key, sortDirection: "asc" };
  if (current.sortDirection === "asc") return { sortKey: key, sortDirection: "desc" };
  return { sortKey: null, sortDirection: null };
}

/** Daftar status unik untuk dropdown filter. */
export function uniqueStatuses(reports: Report[]): string[] {
  return [...new Set(reports.map((r) => r.status).filter(Boolean))].sort();
}
