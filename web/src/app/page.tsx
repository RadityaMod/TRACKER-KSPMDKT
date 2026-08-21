import { Suspense } from "react";
import { getReports, SchemaError } from "@/lib/data/reports";
import { computeInsights, computeMetrics } from "@/lib/data/metrics";
import { computeTraffic } from "@/lib/data/traffic";
import { MetricsRow } from "@/components/metrics-row";
import { TrafficChart } from "@/components/traffic-chart";
import { ReportsTable } from "@/components/reports-table";
import { RefreshButton } from "@/components/refresh-button";
import { SessionActivity } from "@/components/session-activity";

/**
 * Ambil ulang data paling sering tiap 5 menit.
 *
 * Penting begitu sumbernya Google Sheets: tanpa ini halaman di-prerender
 * sekali saat build dan datanya beku selamanya. Tombol Refresh memaksa
 * pengambilan lebih awal lewat revalidatePath.
 */
export const revalidate = 300;

function ErrorPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="font-bold text-red-900">{title}</h2>
      <p className="mt-1 text-sm text-red-800">{detail}</p>
    </div>
  );
}

export default async function Page() {
  let data;
  try {
    data = await getReports();
  } catch (error) {
    if (error instanceof SchemaError) {
      return (
        <Shell>
          <ErrorPanel
            title="Struktur data tidak dikenali"
            detail={error.message}
          />
        </Shell>
      );
    }
    return (
      <Shell>
        <ErrorPanel
          title="Data tidak bisa dibaca"
          detail={error instanceof Error ? error.message : String(error)}
        />
      </Shell>
    );
  }

  const { reports, skipped, unmappedColumns, fallbackReason } = data;
  const metrics = computeMetrics(reports);
  const insights = computeInsights(reports);
  const traffic = computeTraffic(reports);

  return (
    <Shell>
      {fallbackReason && (
        <div
          role="alert"
          className="rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <strong className="block">
            Data ini BUKAN dari Google Sheets — menampilkan snapshot lokal.
          </strong>
          <span className="mt-1 block text-xs">
            Snapshot lokal tidak pernah berubah, jadi angka di halaman ini bisa
            sudah usang. Jangan dipakai untuk mengambil keputusan sebelum
            sambungan Sheets pulih.
          </span>
          <span className="mt-2 block font-mono text-xs break-words">
            {fallbackReason}
          </span>
        </div>
      )}

      {unmappedColumns.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>Kolom tidak ditemukan di sumber data:</strong>{" "}
          {unmappedColumns.join(", ")}. Field terkait akan tampil kosong —
          periksa apakah nama kolom di sheet berubah.
        </p>
      )}

      {skipped.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>{skipped.length} baris dilewati</strong> karena tidak bisa
          diparse: {skipped.map((s) => `baris ${s.line}`).join(", ")}. Sisanya
          tetap ditampilkan.
        </p>
      )}

      <MetricsRow metrics={metrics} insights={insights} />

      <section
        aria-label="Traffic laporan harian"
        // Tanpa padding: grafik mengisi lebar penuh kartu. Padding diatur
        // per bagian di dalam TrafficChart supaya hanya teksnya yang menjorok.
        className="overflow-hidden rounded-xl border border-line bg-surface shadow-card"
      >
        <TrafficChart traffic={traffic} />
      </section>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-4 py-12 text-center">
          <strong className="block">Belum ada data</strong>
          <span className="mt-1 block text-xs text-ink-muted">
            Sumber data terbaca, tetapi tidak berisi satu entri pun.
          </span>
        </div>
      ) : (
        <Suspense fallback={<TableSkeleton />}>
          <ReportsTable reports={reports} />
        </Suspense>
      )}
    </Shell>
  );
}

function TableSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-xl border border-line bg-surface" />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionActivity />
      <header className="text-ink">
        <div className="mx-auto grid min-h-14 w-full max-w-[1440px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:px-6">
          <span aria-hidden="true" />
          <strong className="motion-header-title block text-center text-base font-black tracking-[-0.02em] whitespace-nowrap text-regal-blue sm:text-xl">
            KSP MENDEKAT TRACKER
          </strong>

          <div className="motion-header-actions flex justify-self-end">
            <RefreshButton />
          </div>
        </div>
      </header>

      <main className="motion-stagger mx-auto flex w-full max-w-[1440px] flex-col gap-3 p-3 sm:p-6">
        {children}
      </main>

      <footer className="motion-footer-copy mx-auto w-full max-w-[1440px] px-3 pb-6 text-[11px] text-ink-muted sm:px-6">
        File ini memuat kontak lengkap pelapor. Simpan hanya di perangkat yang
        berizin.
      </footer>
    </>
  );
}
