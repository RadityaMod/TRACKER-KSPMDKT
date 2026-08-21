/**
 * Pemetaan kolom sheet → objek bertipe.
 *
 * Ini SATU-SATUNYA file yang tahu nama kolom di sheet. Semua kode lain bekerja
 * dengan `Report`. Kalau nama kolom berubah di Sheets, yang perlu diubah hanya
 * tabel COLUMNS di bawah.
 *
 * Pemetaan memakai NAMA header, bukan indeks posisi, sehingga menambah kolom
 * baru di Sheets tidak menggeser apa pun.
 */

import type { DateOnly } from "./date";
import { parseDateId } from "./date";
import type { Row } from "./csv";

export interface Report {
  no: number;
  tanggalMasuk: DateOnly | null;
  kanal: string;
  namaPelapor: string;
  /** PII */
  kontakWa: string;
  /** PII */
  noTelpon: string;
  /** PII */
  alamat: string;
  statusPelapor: string;
  kategori: string;
  /** PII — sebagian baris memuat NIK di dalam teks ini. */
  ringkasan: string;
  lampiran: string;
  tautanData: string;
  status: string;
  tanggalUpdate: DateOnly | null;
  catatan: string;
  /** True bila `catatan` menandai entri ini perlu dicek manusia. */
  perluVerifikasi: boolean;
}

/**
 * Nama kolom yang diterima untuk tiap field.
 *
 * Sengaja berupa daftar, bukan satu string: Google Sheet memakai
 * "No. Telpon" sedangkan snapshot CSV lokal memakai "No. Telepon". Memilih
 * salah satu akan mengosongkan kolom itu di sumber yang lain — persis
 * kegagalan diam-diam yang sudah pernah terjadi. Nama pertama adalah yang
 * kanonik; sisanya alias yang masih dikenali.
 */
const COLUMNS = {
  no: ["No"],
  tanggalMasuk: ["Tanggal Masuk"],
  kanal: ["Kanal"],
  namaPelapor: ["Nama Pelapor"],
  kontakWa: ["Kontak WA / ID Chat"],
  noTelpon: ["No. Telpon", "No. Telepon", "Nomor Telepon"],
  alamat: ["Alamat"],
  statusPelapor: ["Status Pelapor"],
  kategori: ["Kategori Aduan"],
  ringkasan: ["Ringkasan Aspirasi"],
  lampiran: ["Lampiran"],
  tautanData: [
    "Tauatan Link Data",
    "Tauatan Link data",
    "Tautan Link Data",
    "Tautan Link data",
    "Tautan Data",
  ],
  status: ["Status Tindak Lanjut"],
  tanggalUpdate: ["Tanggal Update Terakhir"],
  catatan: ["Catatan"],
} as const satisfies Record<string, readonly string[]>;

/**
 * Kolom yang wajib ada. Kalau salah satunya hilang, lebih baik gagal keras
 * dengan pesan jelas daripada diam-diam merender kolom kosong.
 */
const REQUIRED: readonly (readonly string[])[] = [
  COLUMNS.no,
  COLUMNS.tanggalMasuk,
  COLUMNS.namaPelapor,
  COLUMNS.kategori,
  COLUMNS.status,
];

export class SchemaError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Kolom wajib tidak ditemukan di sumber data: ${missing.join(", ")}. ` +
        `Periksa apakah nama kolom di sheet berubah.`,
    );
    this.name = "SchemaError";
    this.missing = missing;
  }
}

export interface ParseResult {
  reports: Report[];
  /** Baris yang dilewati karena rusak, beserta alasannya. */
  skipped: { line: number; reason: string }[];
  /**
   * Kolom di COLUMNS yang tidak ditemukan di header sumber.
   *
   * Kolom non-wajib yang salah nama TIDAK melempar error — field-nya hanya
   * jadi kosong. Itu persis yang sempat terjadi: pemetaan tertulis
   * "No. Telpon" padahal sheet memakai "No. Telepon", dan seluruh nomor
   * telepon hilang diam-diam tanpa satu pun test gagal. Daftar ini membuat
   * kesalahan seperti itu terlihat, bukan tersembunyi.
   */
  unmappedColumns: string[];
}

/** Tandai entri yang catatannya minta verifikasi manusia. */
function needsVerification(catatan: string): boolean {
  return /perlu verifikasi|duplikat/i.test(catatan);
}

/**
 * Ubah baris CSV mentah (baris pertama = header) menjadi Report bertipe.
 *
 * Baris yang gagal diparse akan DILEWATI dan dicatat, bukan melempar error.
 * Satu baris rusak tidak boleh menjatuhkan seluruh halaman.
 */
export function parseReports(rows: Row[]): ParseResult {
  const [headers, ...body] = rows;
  // Tanpa header sama sekali: laporkan nama kanonik tiap kolom wajib.
  if (!headers) throw new SchemaError(REQUIRED.map((names) => names[0]));

  /** Indeks kolom pertama dari daftar alias yang benar-benar ada di header. */
  const index = (names: readonly string[]) => {
    for (const name of names) {
      const i = headers.indexOf(name);
      if (i >= 0) return i;
    }
    return -1;
  };

  const missing = REQUIRED.filter((names) => index(names) < 0).map(
    (names) => names[0],
  );
  if (missing.length > 0) throw new SchemaError(missing);

  // Kolom opsional yang tidak cocok dengan satu pun alias tidak fatal, tapi
  // harus terlihat — bukan diam-diam jadi kosong.
  const unmappedColumns = Object.values(COLUMNS)
    .filter((names) => index(names) < 0)
    .map((names) => names[0]);

  const at = (row: Row, names: readonly string[]) => {
    const i = index(names);
    return i < 0 ? "" : (row[i] ?? "").trim();
  };

  const reports: Report[] = [];
  const skipped: ParseResult["skipped"] = [];

  body.forEach((row, offset) => {
    // +2: satu untuk header, satu karena manusia menghitung dari 1.
    const line = offset + 2;

    const rawNo = at(row, COLUMNS.no);
    const no = Number(rawNo);
    if (!rawNo || !Number.isFinite(no)) {
      skipped.push({ line, reason: `Kolom "No" bukan angka: ${JSON.stringify(rawNo)}` });
      return;
    }

    const catatan = at(row, COLUMNS.catatan);

    reports.push({
      no,
      tanggalMasuk: parseDateId(at(row, COLUMNS.tanggalMasuk)),
      kanal: at(row, COLUMNS.kanal),
      namaPelapor: at(row, COLUMNS.namaPelapor),
      kontakWa: at(row, COLUMNS.kontakWa),
      noTelpon: at(row, COLUMNS.noTelpon),
      alamat: at(row, COLUMNS.alamat),
      statusPelapor: at(row, COLUMNS.statusPelapor),
      kategori: at(row, COLUMNS.kategori),
      ringkasan: at(row, COLUMNS.ringkasan),
      lampiran: at(row, COLUMNS.lampiran),
      tautanData: at(row, COLUMNS.tautanData),
      status: at(row, COLUMNS.status),
      tanggalUpdate: parseDateId(at(row, COLUMNS.tanggalUpdate)),
      catatan,
      perluVerifikasi: needsVerification(catatan),
    });
  });

  return { reports, skipped, unmappedColumns };
}
