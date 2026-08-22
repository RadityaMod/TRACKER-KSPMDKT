/**
 * Agregasi laporan per hari untuk grafik traffic.
 *
 * Perbaikan dari dashboard lama: rentang BERHENTI di tanggal data terakhir.
 * Versi lama memperpanjang sumbu sampai `today`, sehingga garis terjun ke nol
 * selama berhari-hari setelah entri terakhir dan terlihat seperti pelaporan
 * runtuh, padahal hanya belum ada data baru.
 *
 * Hari kosong DI TENGAH rentang tetap digambar nol — itu informasi nyata.
 */

import type { DateOnly } from "./date";
import { dateRange, daysInMonth } from "./date";
import type { Report } from "./schema";

const TRAFFIC_START_DATE: DateOnly = "2026-05-01";

export interface TrafficPoint {
  date: DateOnly;
  count: number;
}

export interface Traffic {
  points: TrafficPoint[];
  peak: TrafficPoint | null;
  total: number;
}

/** Ambil sejumlah hari terakhir, dihitung mundur dari tanggal data terbaru. */
export function limitTrafficWindow(traffic: Traffic, days: number | null): Traffic {
  if (days === null || traffic.points.length <= days) return traffic;

  const points = traffic.points.slice(-Math.max(1, Math.trunc(days)));
  const peak = points.reduce(
    (best, point) => (point.count > best.count ? point : best),
    points[0],
  );
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return { points, peak, total };
}

/** Ambil satu bulan kalender penuh yang memuat tanggal data terbaru. */
export function limitTrafficToLatestMonth(traffic: Traffic): Traffic {
  const latest = traffic.points.at(-1);
  if (!latest) return traffic;

  const [year, month] = latest.date.split("-").map(Number);
  const monthPrefix = latest.date.slice(0, 7);
  const firstDate = `${monthPrefix}-01`;
  const lastDate = `${monthPrefix}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
  const counts = new Map(traffic.points.map((point) => [point.date, point.count]));
  const points = dateRange(firstDate, lastDate).map((date) => ({
    date,
    count: counts.get(date) ?? 0,
  }));
  const peak = points.reduce(
    (best, point) => (point.count > best.count ? point : best),
    points[0],
  );
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return { points, peak, total };
}

export function computeTraffic(reports: Report[]): Traffic {
  const counts = new Map<DateOnly, number>();

  for (const report of reports) {
    if (!report.tanggalMasuk) continue;
    if (report.tanggalMasuk < TRAFFIC_START_DATE) continue;
    counts.set(report.tanggalMasuk, (counts.get(report.tanggalMasuk) ?? 0) + 1);
  }

  const dates = [...counts.keys()].sort();
  if (dates.length === 0) {
    return { points: [], peak: null, total: 0 };
  }

  // Mulai 1 Mei sesuai cakupan dashboard, lalu berhenti di data terakhir —
  // sengaja tidak diperpanjang ke hari ini.
  const points = dateRange(TRAFFIC_START_DATE, dates[dates.length - 1]).map(
    (date) => ({
      date,
      count: counts.get(date) ?? 0,
    }),
  );

  const peak = points.reduce(
    (best, point) => (point.count > best.count ? point : best),
    points[0],
  );

  let total = 0;
  for (const count of counts.values()) total += count;

  return { points, peak, total };
}
