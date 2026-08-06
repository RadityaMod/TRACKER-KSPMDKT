"use client";

import { useEffect, useRef } from "react";
import { formatLong } from "@/lib/data/date";
import type { Report } from "@/lib/data/schema";
import { ChannelBadge } from "./channel-badge";
import { StatusBadge } from "./status-badge";

interface Field {
  label: string;
  value: string;
  wide?: boolean;
  prose?: boolean;
  /** Ganti teks polos dengan elemen sendiri, mis. badge kanal. */
  render?: React.ReactNode;
}

function FieldList({ fields }: { fields: Field[] }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className={field.wide ? "sm:col-span-2" : ""}>
          <dt className="mb-0.5 text-[11px] text-ink-muted">{field.label}</dt>
          <dd
            className={
              field.prose
                ? "text-sm leading-relaxed break-words"
                : "text-sm font-semibold break-words"
            }
          >
            {field.render ?? (field.value || "—")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ReportDetailDialog({
  report,
  onClose,
}: {
  report: Report | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (report && !dialog.open) dialog.showModal();
    if (!report && dialog.open) dialog.close();
  }, [report]);

  // `close` menangani Esc dan tombol tutup sekaligus, jadi state induk
  // selalu ikut sinkron walau dialog ditutup lewat keyboard.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="detail-title"
      className="m-auto w-[min(760px,calc(100%-2rem))] rounded-2xl p-0 backdrop:bg-regal-blue/40 backdrop:backdrop-blur-sm"
      onClick={(event) => {
        // Klik pada backdrop (bukan isi) menutup dialog.
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      {report && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 bg-endless-sky px-6 py-4 text-white">
            <div className="min-w-0">
              <p className="text-[11px] text-royal-light-blue">
                Entri No. {report.no} · masuk{" "}
                {report.tanggalMasuk ? formatLong(report.tanggalMasuk) : "tanggal tidak tercatat"}
              </p>
              <h2 id="detail-title" className="text-xl font-bold break-words">
                {report.namaPelapor || "Tanpa nama"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="shrink-0 rounded-lg border border-white/40 px-3 py-1.5 text-xs font-bold hover:bg-white/10"
            >
              Tutup
            </button>
          </header>

          <div className="overflow-auto px-6 pb-6">
            <div className="flex items-center justify-between gap-4 border-b border-slient-grey py-3">
              <StatusBadge status={report.status} />
              <span className="text-[11px] text-ink-muted">
                Pembaruan terakhir{" "}
                {report.tanggalUpdate ? formatLong(report.tanggalUpdate) : "belum tercatat"}
              </span>
            </div>

            {report.perluVerifikasi && (
              <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <strong>Perlu verifikasi.</strong> Catatan pada entri ini menandai
                kemungkinan duplikat atau data yang perlu dicek ulang sebelum ditindaklanjuti.
              </p>
            )}

            <section className="pt-5">
              <h3 className="mb-2 text-[11px] tracking-wider text-ink-muted uppercase">
                Profil pelapor
              </h3>
              <FieldList
                fields={[
                  {
                    label: "Kanal",
                    value: report.kanal,
                    render: <ChannelBadge channel={report.kanal} />,
                  },
                  { label: "Status pelapor", value: report.statusPelapor },
                  { label: "Kontak WA / ID Chat", value: report.kontakWa },
                  { label: "Nomor telepon", value: report.noTelpon },
                  { label: "Alamat", value: report.alamat, wide: true },
                ]}
              />
            </section>

            <section className="pt-5">
              <h3 className="mb-2 text-[11px] tracking-wider text-ink-muted uppercase">
                Laporan dan aspirasi
              </h3>
              <FieldList
                fields={[
                  { label: "Kategori aduan", value: report.kategori, wide: true },
                  { label: "Ringkasan aspirasi", value: report.ringkasan, wide: true, prose: true },
                  { label: "Lampiran", value: report.lampiran, wide: true },
                ]}
              />
            </section>

            <section className="pt-5">
              <h3 className="mb-2 text-[11px] tracking-wider text-ink-muted uppercase">
                Tindak lanjut
              </h3>
              <FieldList
                fields={[
                  { label: "Status tindak lanjut", value: report.status },
                  {
                    label: "Tanggal pembaruan",
                    value: report.tanggalUpdate ? formatLong(report.tanggalUpdate) : "",
                  },
                  { label: "Catatan", value: report.catatan, wide: true, prose: true },
                ]}
              />
            </section>

            <p className="mt-5 rounded-lg bg-white-sand px-3 py-2 text-[11px] text-ink-muted">
              Berisi kontak lengkap pelapor. Jangan dibagikan ke luar tim yang berwenang.
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
