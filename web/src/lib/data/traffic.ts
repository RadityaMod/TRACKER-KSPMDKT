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
import { dateRange } from "./date";
import type { Report } from "./schema";

export interface TrafficPoint {
  date: DateOnly;
  count: number;
}

export interface Traffic {
  points: TrafficPoint[];
  peak: TrafficPoint | null;
  total: number;
}

export function computeTraffic(reports: Report[]): Traffic {
  const counts = new Map<DateOnly, number>();

  for (const report of reports) {
    if (!report.tanggalMasuk) continue;
    counts.set(report.tanggalMasuk, (counts.get(report.tanggalMasuk) ?? 0) + 1);
  }

  const dates = [...counts.keys()].sort();
  if (dates.length === 0) {
    return { points: [], peak: null, total: 0 };
  }

  // Berhenti di data terakhir — sengaja tidak diperpanjang ke hari ini.
  const points = dateRange(dates[0], dates[dates.length - 1]).map((date) => ({
    date,
    count: counts.get(date) ?? 0,
  }));

  const peak = points.reduce(
    (best, point) => (point.count > best.count ? point : best),
    points[0],
  );

  let total = 0;
  for (const count of counts.values()) total += count;

  return { points, peak, total };
}
