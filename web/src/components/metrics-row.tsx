import type { Insights, Metrics } from "@/lib/data/metrics";
import { channelTone } from "./channel-badge";

/**
 * Baris ringkasan di kepala dashboard.
 *
 * KPI status (Baru / Proses / Selesai) hanya ditampilkan bila sumber data
 * benar-benar memakai lebih dari satu status. Selama seluruh entri masih
 * "Baru", tiga dari empat tile-nya permanen nol dan hanya memakan ruang paling
 * berharga di halaman — jadi ruang itu diberikan ke angka yang bergerak:
 * sebaran kanal dan entri yang perlu diverifikasi.
 */

function Tile({
  label,
  value,
  sub,
  accent = "",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="motion-metric-item min-w-0 border-line px-4 py-3 not-first:border-l">
      <dt className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1 truncate text-2xl leading-none font-bold tabular-nums ${accent || "text-regal-blue"}`}
      >
        {value}
      </dd>
      {sub && (
        <dd className="mt-1 truncate text-[11px] text-ink-muted">{sub}</dd>
      )}
    </div>
  );
}

const TONE_TEXT: Record<string, string> = {
  whatsapp: "text-emerald-800",
  oca: "text-rose-800",
  netral: "text-regal-blue",
};

export function MetricsRow({
  metrics,
  insights,
}: {
  metrics: Metrics;
  insights: Insights;
}) {
  // Lebih dari satu status berarti KPI status sudah bermakna.
  const statusBermakna = insights.ragamStatus > 1;

  return (
    <section aria-label="Ringkasan pelapor">
      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-card sm:grid-cols-4">
        <Tile label="Total laporan" value={insights.total} />

        {statusBermakna ? (
          <>
            <Tile label="Baru" value={metrics.baru} />
            <Tile label="Proses" value={metrics.proses} />
            <Tile
              label="Selesai"
              value={metrics.selesai}
              accent="text-emerald-800"
            />
          </>
        ) : (
          <>
            {insights.kanal.slice(0, 2).map((k) => (
              <Tile
                key={k.label}
                label={k.label}
                value={k.count}
                sub={`${Math.round((k.count / Math.max(insights.total, 1)) * 100)}% dari total`}
                accent={TONE_TEXT[channelTone(k.label)]}
              />
            ))}

            <Tile
              label="Perlu verifikasi"
              value={insights.perluVerifikasi}
              sub={
                insights.perluVerifikasi > 0
                  ? "duplikat atau data perlu dicek"
                  : "tidak ada"
              }
              accent={
                insights.perluVerifikasi > 0
                  ? "text-amber-700"
                  : "text-ink-muted"
              }
            />
          </>
        )}
      </dl>
    </section>
  );
}
