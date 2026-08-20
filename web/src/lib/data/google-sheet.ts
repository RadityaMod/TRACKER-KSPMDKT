/**
 * Sumber data Google Sheets lewat service account.
 *
 * Sheet TETAP PRIVAT: yang dibagikan hanyalah akses Viewer ke email service
 * account. Tidak ada URL tanpa auth yang memuat data pelapor.
 *
 * Mode "public CSV export" (docs.google.com/.../export?format=csv) sengaja
 * TIDAK disediakan. Mode itu mensyaratkan sheet dibuka untuk "anyone with the
 * link", sehingga siapa pun yang punya ID bisa mengunduh CSV mentah berisi
 * nomor telepon, NIK, dan alamat pelapor — melewati seluruh lapisan auth
 * aplikasi.
 */

// JWT diambil dari `googleapis`, BUKAN dari paket google-auth-library
// terpisah. googleapis membundel salinannya sendiri, sehingga dua kelas JWT
// itu berbeda identitas dan TypeScript menolaknya
// ("private property 'redirectUri'").
import { google } from "googleapis";
import type { RawData, ReportSource } from "./source";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

export interface GoogleSheetConfig {
  spreadsheetId: string;
  range: string;
  clientEmail: string;
  privateKey: string;
}

export class GoogleSheetSource implements ReportSource {
  private readonly config: GoogleSheetConfig;

  constructor(config: GoogleSheetConfig) {
    this.config = config;
  }

  async read(): Promise<RawData> {
    const auth = new google.auth.JWT({
      email: this.config.clientEmail,
      key: this.config.privateKey,
      scopes: [SCOPE],
    });

    const sheets = google.sheets({ version: "v4", auth });

    let response;
    try {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: this.config.range,
        // Ambil nilai tampilan supaya tanggal tetap "DD/MM/YYYY", bukan
        // serial number Google.
        valueRenderOption: "FORMATTED_VALUE",
      });
    } catch (error) {
      throw new Error(describeSheetError(error, this.config.clientEmail));
    }

    const rows = (response.data.values ?? []) as string[][];
    if (rows.length === 0) {
      throw new Error(
        `Sheet terbaca tetapi rentang "${this.config.range}" kosong. ` +
          `Periksa nama tab dan rentangnya.`,
      );
    }

    return { rows: padRows(rows), label: "Google Sheets" };
  }
}

/**
 * Samakan panjang setiap baris dengan header.
 *
 * Sheets API memangkas sel kosong di ujung kanan, sehingga baris yang kolom
 * terakhirnya kosong akan lebih pendek dari header. Tanpa disamakan, indeks
 * kolom meleset saat pemetaan dan field terakhir terbaca undefined.
 */
export function padRows(rows: string[][]): string[][] {
  const width = rows[0]?.length ?? 0;
  return rows.map((row) =>
    row.length >= width
      ? row
      : [...row, ...Array(width - row.length).fill("")],
  );
}

/** Ubah error Google jadi pesan yang bisa ditindaklanjuti. */
export function describeSheetError(error: unknown, clientEmail: string): string {
  const status =
    typeof error === "object" && error !== null && "code" in error
      ? Number((error as { code: unknown }).code)
      : undefined;

  const detail = error instanceof Error ? error.message : String(error);

  if (status === 403) {
    return (
      `Akses ditolak (403). Bagikan sheet ke ${clientEmail} sebagai Viewer, ` +
      `dan pastikan Google Sheets API sudah diaktifkan di project GCP. (${detail})`
    );
  }
  if (status === 404) {
    return `Spreadsheet tidak ditemukan (404). Periksa SHEET_ID. (${detail})`;
  }
  if (status === 429) {
    return `Kuota Sheets API terlampaui (429). Coba lagi sebentar. (${detail})`;
  }
  return `Gagal membaca Google Sheets: ${detail}`;
}

/**
 * Baca konfigurasi dari environment.
 *
 * Mengembalikan null bila env belum lengkap, supaya aplikasi memakai CSV lokal
 * alih-alih gagal total. Dengan begitu repo tetap bisa dijalankan siapa pun
 * tanpa kredensial.
 */
export function readGoogleSheetConfig(): GoogleSheetConfig | null {
  const spreadsheetId = process.env.SHEET_ID?.trim();
  const configuredRange = process.env.SHEET_RANGE?.trim() || "Sheet1!A:Z";
  // Deployment lama memakai A:N. Setelah kolom PIC ditambahkan, Catatan
  // bergeser ke O dan tidak lagi ikut terbaca. Lebarkan konfigurasi lama
  // tanpa mengubah nama tab; rentang lain yang sudah diperbarui tetap utuh.
  const range = configuredRange.replace(/!A:N$/i, "!A:Z");
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (!spreadsheetId || !raw) return null;

  let parsed: { client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON yang valid. Tempel isi file " +
        "kunci service account secara utuh dalam satu baris, dibungkus tanda kutip tunggal.",
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON tidak memuat client_email / private_key.",
    );
  }

  return {
    spreadsheetId,
    range,
    clientEmail: parsed.client_email,
    // File .env menyimpan newline sebagai literal \n — harus dikembalikan
    // jadi newline sungguhan, kalau tidak parsing kunci PEM gagal.
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}
