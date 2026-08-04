/**
 * Sumber data, di balik satu interface.
 *
 * Seluruh aplikasi hanya tahu `ReportSource`. Saat sumber pindah dari CSV
 * lokal ke Google Sheets, komponen dashboard tidak perlu berubah.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv";
import { GoogleSheetSource, readGoogleSheetConfig } from "./google-sheet";

export interface RawData {
  /** Baris mentah; elemen pertama adalah header. */
  rows: string[][];
  /** Label sumber, ditampilkan di header aplikasi. */
  label: string;
  /**
   * Terisi HANYA bila sumber utama gagal dan fallback lokal dipakai.
   * Halaman menampilkannya sebagai banner merah.
   */
  fallbackReason?: string;
}

export interface ReportSource {
  read(): Promise<RawData>;
}

export class LocalCsvSource implements ReportSource {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async read(): Promise<RawData> {
    const text = await readFile(this.filePath, "utf8");
    return {
      rows: parseCsv(text),
      label: `CSV lokal · ${path.basename(this.filePath)}`,
    };
  }
}

/**
 * Pakai `fallback` bila `primary` gagal, dan LAPORKAN alasannya.
 *
 * Sengaja opt-in lewat ALLOW_LOCAL_FALLBACK, bukan perilaku default. Fallback
 * diam-diam berbahaya di sini: CSV lokal adalah snapshot beku, jadi salah
 * ketik satu huruf di SHEET_RANGE akan membuat dashboard tampak normal sambil
 * menyajikan data yang makin lama makin basi. `fallbackReason` memastikan
 * kondisi itu terlihat, bukan tersembunyi di balik label kecil.
 */
export class FallbackSource implements ReportSource {
  private readonly primary: ReportSource;
  private readonly fallback: ReportSource;

  constructor(primary: ReportSource, fallback: ReportSource) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async read(): Promise<RawData> {
    try {
      return await this.primary.read();
    } catch (error) {
      const data = await this.fallback.read();
      return {
        ...data,
        fallbackReason: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

const LOCAL_CSV = path.join(process.cwd(), "data", "laporan.csv");

function fallbackAllowed(): boolean {
  return process.env.ALLOW_LOCAL_FALLBACK?.trim().toLowerCase() === "true";
}

/**
 * Pilih sumber aktif.
 *
 * - Google Sheets bila SHEET_ID + GOOGLE_SERVICE_ACCOUNT_JSON terisi.
 * - Selain itu CSV lokal, supaya repo tetap bisa dijalankan tanpa kredensial.
 *
 * Bila Sheets dikonfigurasi tetapi gagal dibaca, secara default error-nya
 * dibiarkan naik ke halaman error. Setel ALLOW_LOCAL_FALLBACK=true untuk
 * menyajikan snapshot lokal disertai banner peringatan.
 */
export function getSource(): ReportSource {
  const config = readGoogleSheetConfig();
  if (!config) return new LocalCsvSource(LOCAL_CSV);

  const sheets = new GoogleSheetSource(config);
  return fallbackAllowed()
    ? new FallbackSource(sheets, new LocalCsvSource(LOCAL_CSV))
    : sheets;
}
