/**
 * Parsing tanggal untuk data KSP Mendekat.
 *
 * Sheet memakai format DD/MM/YYYY. JANGAN pernah menyerahkan string ini ke
 * `new Date(...)`: `new Date("03/06/2026")` diparse sebagai 6 Maret, bukan
 * 3 Juni. Kesalahan itu tidak melempar error — grafik hanya jadi salah diam-
 * diam, dan sebagian tanggal tetap terlihat masuk akal sehingga sulit
 * ketahuan. Karena itu parsing di sini eksplisit dan berbasis regex.
 */

/** Tanggal tanpa jam, dinormalkan ke "YYYY-MM-DD". */
export type DateOnly = string;

const DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/**
 * Parse "DD/MM/YYYY" → "YYYY-MM-DD".
 * Mengembalikan null untuk input kosong, salah format, atau tanggal yang
 * tidak ada (mis. 31/02/2026).
 */
export function parseDateId(value: string | undefined | null): DateOnly | null {
  const match = String(value ?? "").trim().match(DMY);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Jumlah hari dalam satu bulan, memperhitungkan tahun kabisat. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "YYYY-MM-DD" → Date pada UTC tengah malam. Aman dari pergeseran zona waktu. */
export function toDate(id: DateOnly): Date {
  const [year, month, day] = id.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Date → "YYYY-MM-DD" memakai komponen UTC. */
export function toDateOnly(date: Date): DateOnly {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Geser sejumlah hari, tetap di UTC. */
export function addDays(id: DateOnly, days: number): DateOnly {
  const date = toDate(id);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

/** Seluruh tanggal dari `from` sampai `to` inklusif. */
export function dateRange(from: DateOnly, to: DateOnly): DateOnly[] {
  const out: DateOnly[] = [];
  let cursor = from;
  // Batas pengaman supaya data rusak tidak bikin loop tak berujung.
  for (let i = 0; cursor <= to && i < 5000; i++) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** "2026-06-03" → "03 Jun" untuk label grafik. */
export function formatShort(id: DateOnly): string {
  const date = toDate(id);
  return `${pad(date.getUTCDate())} ${MONTHS_ID[date.getUTCMonth()]}`;
}

/** "2026-06-03" → "03 Jun 2026" untuk teks. */
export function formatLong(id: DateOnly): string {
  return `${formatShort(id)} ${toDate(id).getUTCFullYear()}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
