import type { Metrics } from "@/lib/data/metrics";

const TILES = [
  { key: "total", label: "Total" },
  { key: "baru", label: "Baru" },
  { key: "proses", label: "Proses" },
  { key: "selesai", label: "Selesai" },
] as const;

export function MetricsRow({ metrics }: { metrics: Metrics }) {
  return (
    <section aria-label="Ringkasan pelapor">
      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-slient-grey bg-white sm:grid-cols-4">
        {TILES.map((tile, index) => (
          <div
            key={tile.key}
            className={[
              "px-4 py-3 text-center",
              index > 0 ? "border-slient-grey sm:border-l" : "",
              index >= 2 ? "border-t border-slient-grey sm:border-t-0" : "",
              index === 1 ? "border-l border-slient-grey" : "",
            ].join(" ")}
          >
            <dt className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
              {tile.label}
            </dt>
            <dd className="mt-1 text-2xl leading-none font-bold text-regal-blue tabular-nums">
              {metrics[tile.key]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
