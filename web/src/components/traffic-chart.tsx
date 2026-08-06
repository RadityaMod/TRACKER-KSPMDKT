"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatLong, formatShort } from "@/lib/data/date";
import type { Traffic } from "@/lib/data/traffic";

const chartConfig = {
  laporan: {
    label: "Laporan masuk",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

/**
 * Pilih indeks titik yang diberi label tanggal di sumbu X.
 *
 * Rentang data 70+ hari, jadi memberi label setiap hari akan bertumpuk jadi
 * bubur. Selalu sertakan titik pertama dan terakhir, lalu sisipkan beberapa
 * label berjarak sama di antaranya.
 */
export function tickIndices(total: number, desired: number): number[] {
  if (total <= 0) return [];
  if (total === 1) return [0];

  const count = Math.min(desired, total);
  if (count <= 2) return [0, total - 1];

  const step = (total - 1) / (count - 1);
  return [...new Set(Array.from({ length: count }, (_, i) => Math.round(i * step)))];
}

export function TrafficChart({ traffic }: { traffic: Traffic }) {
  if (traffic.points.length === 0) {
    return (
      <p className="grid h-24 place-items-center px-4 text-sm text-ink-muted">
        Belum ada tanggal masuk yang bisa diplot.
      </p>
    );
  }

  const { points, peak } = traffic;

  const chartData = points.map((point) => ({
    date: point.date,
    laporan: point.count,
  }));

  // Recharts memilih tick sendiri dan bisa menaruhnya di tanggal acak.
  // Daftar eksplisit ini menjamin label pertama dan terakhir selalu muncul.
  const ticks = tickIndices(points.length, 7).map((i) => points[i].date);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2 px-4 pt-4">
        <div>
          <span className="block text-[11px] font-bold tracking-wider text-ink-muted uppercase">
            Traffic harian
          </span>
          <strong className="block text-base text-regal-blue">
            Laporan masuk per hari
          </strong>
        </div>
        <span className="text-xs text-ink-muted">
          {formatLong(points[0].date)} – {formatLong(points.at(-1)!.date)}
        </span>
      </div>

      <ChartContainer
        config={chartConfig}
        // aspect-video dari shadcn dilepas: 70 titik harian butuh lebar penuh
        // dengan tinggi tetap, bukan rasio 16:9 yang jadi sangat tinggi.
        className="aspect-auto h-[190px] w-full"
      >
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 16, left: 12, right: 12, bottom: 4 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            // Di layar sempit ketujuh label saling menempel. minTickGap
            // membuang label yang jaraknya < 56px, tapi tetap mempertahankan
            // tanggal pertama dan terakhir.
            interval="preserveStartEnd"
            minTickGap={56}
            tickFormatter={formatShort}
          />
          <YAxis
            width={28}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tickMargin={4}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(value) => formatLong(String(value))}
              />
            }
          />
          <Line
            dataKey="laporan"
            type="natural"
            stroke="var(--color-laporan)"
            strokeWidth={2}
            // 70 titik: dot statis di tiap hari jadi terlalu ramai, jadi hanya
            // titik aktif saat hover yang ditampilkan.
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ChartContainer>

      <div className="flex flex-col items-start gap-1 px-4 pt-2 pb-4 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium text-regal-blue">
          Puncak {peak?.count ?? 0} laporan pada{" "}
          {peak ? formatLong(peak.date) : "—"}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-ink-muted">
          Total {traffic.total} laporan sepanjang {points.length} hari
        </div>
      </div>

      <details className="px-4 pb-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs text-ink-muted">
          Lihat data grafik sebagai tabel
        </summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slient-grey">
          <table className="w-full text-xs">
            <caption className="sr-only">Jumlah laporan masuk per hari</caption>
            <thead className="sticky top-0 bg-cute-silver text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-1.5 text-left font-semibold">
                  Tanggal
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">
                  Laporan
                </th>
              </tr>
            </thead>
            <tbody>
              {points
                .filter((point) => point.count > 0)
                .map((point) => (
                  <tr key={point.date} className="border-t border-slient-grey">
                    <td className="px-3 py-1.5">{formatLong(point.date)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {point.count}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
