"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatLong } from "@/lib/data/date";
import type { Report } from "@/lib/data/schema";
import {
  applyQuery,
  EMPTY_QUERY,
  nextSort,
  uniqueStatuses,
  type Query,
  type SortDirection,
  type SortKey,
} from "@/lib/data/filter";
import { ChannelBadge } from "./channel-badge";
import { ReportDetailDialog } from "./report-detail-dialog";
import { StatusBadge } from "./status-badge";

function ariaSort(active: boolean, direction: SortDirection) {
  if (!active || !direction) return "none" as const;
  return direction === "asc" ? ("ascending" as const) : ("descending" as const);
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  const arrow = !active || !direction ? "—" : direction === "asc" ? "↑" : "↓";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 font-bold ${active ? "text-regal-blue" : ""}`}
    >
      {label}
      <span
        aria-hidden
        className={`grid h-5 w-5 place-items-center rounded-full border text-[13px] leading-none ${
          active
            ? "border-royal-light-blue bg-sky-50 text-smothe-blue"
            : "border-line text-ink-muted"
        }`}
      >
        {arrow}
      </span>
    </button>
  );
}

export function ReportsTable({ reports }: { reports: Report[] }) {
  const params = useSearchParams();

  const [query, setQuery] = useState<Query>(() => {
    const sort = params.get("sort") as SortKey;
    const dir = params.get("dir") as SortDirection;
    return {
      search: params.get("q") ?? "",
      status: params.get("status") ?? "",
      // URL menang bila memuat sortir; kalau tidak, pakai default
      // (pembaruan terbaru dulu), bukan urutan mentah sheet.
      sortKey: sort ?? EMPTY_QUERY.sortKey,
      sortDirection: sort ? dir : EMPTY_QUERY.sortDirection,
    };
  });

  const [selected, setSelected] = useState<Report | null>(null);

  // Cerminkan state ke URL tanpa navigasi server, supaya tampilan bisa
  // dibagikan tapi filter tetap instan.
  useEffect(() => {
    const next = new URLSearchParams();
    if (query.search) next.set("q", query.search);
    if (query.status) next.set("status", query.status);
    if (query.sortKey && query.sortDirection) {
      next.set("sort", query.sortKey);
      next.set("dir", query.sortDirection);
    }
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [query]);

  const statuses = useMemo(() => uniqueStatuses(reports), [reports]);
  const visible = useMemo(() => applyQuery(reports, query), [reports, query]);

  const setSort = (key: Exclude<SortKey, null>) =>
    setQuery((current) => ({ ...current, ...nextSort(current, key) }));

  const reset = () => setQuery(EMPTY_QUERY);

  return (
    <section
      aria-label="Daftar pelapor"
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-card"
    >
      <div className="grid gap-2 border-b border-line p-3 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
        <div>
          <label htmlFor="search" className="sr-only">
            Cari pelapor atau aspirasi
          </label>
          <input
            id="search"
            type="search"
            value={query.search}
            onChange={(event) =>
              setQuery((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Ketik nama, lokasi, atau kata kunci"
            className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-smothe-blue"
          />
        </div>

        <div>
          <label htmlFor="statusFilter" className="sr-only">
            Status tindak lanjut
          </label>
          <select
            id="statusFilter"
            value={query.status}
            onChange={(event) =>
              setQuery((current) => ({ ...current, status: event.target.value }))
            }
            disabled={statuses.length < 2}
            className="h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-smothe-blue disabled:bg-surface-sunken disabled:text-ink-muted"
          >
            <option value="">Semua status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={reset}
          className="h-11 rounded-lg border border-line px-4 text-sm font-bold hover:bg-surface-sunken"
        >
          Hapus filter
        </button>
      </div>

      {statuses.length < 2 && (
        <p className="border-b border-line bg-sky-50 px-3 py-2 text-xs text-endless-sky">
          Seluruh {reports.length} entri berstatus{" "}
          <strong>{statuses[0] ?? "kosong"}</strong>, jadi filter status belum ada
          gunanya. Tile Proses dan Selesai akan tetap nol sampai status di sumber
          data diperbarui.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Daftar pelapor KSP Mendekat, {visible.length} dari {reports.length} entri
          </caption>
          <thead>
            <tr className="bg-surface-sunken text-left text-[11px] tracking-wide text-ink-muted uppercase">
              {/* Nomor urut tampilan, bukan nomor entri di sheet. Karena
                  daftar diurutkan, nomor entri tidak lagi berurutan dan
                  sulit dipakai menghitung posisi. */}
              <th scope="col" className="px-3 py-2 font-bold">
                No
              </th>
              <th
                scope="col"
                className="px-3 py-2"
                aria-sort={ariaSort(query.sortKey === "masuk", query.sortDirection)}
              >
                <SortButton
                  label="Tanggal Masuk"
                  active={query.sortKey === "masuk"}
                  direction={query.sortDirection}
                  onClick={() => setSort("masuk")}
                />
              </th>
              <th
                scope="col"
                className="px-3 py-2"
                aria-sort={ariaSort(query.sortKey === "status", query.sortDirection)}
              >
                <SortButton
                  label="Status"
                  active={query.sortKey === "status"}
                  direction={query.sortDirection}
                  onClick={() => setSort("status")}
                />
              </th>
              <th scope="col" className="px-3 py-2 font-bold">
                Pelapor
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2 lg:table-cell"
                aria-sort={ariaSort(query.sortKey === "kanal", query.sortDirection)}
              >
                <SortButton
                  label="Kanal"
                  active={query.sortKey === "kanal"}
                  direction={query.sortDirection}
                  onClick={() => setSort("kanal")}
                />
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2 lg:table-cell"
                aria-sort={ariaSort(query.sortKey === "kategori", query.sortDirection)}
              >
                <SortButton
                  label="Kategori"
                  active={query.sortKey === "kategori"}
                  direction={query.sortDirection}
                  onClick={() => setSort("kategori")}
                />
              </th>
              {/* Menempel di tepi kanan: di layar sempit tabel di-scroll
                  horizontal, dan tanpa ini tombol Detail ikut hilang ke luar
                  layar sehingga baris tidak bisa dibuka lewat keyboard. */}
              <th
                scope="col"
                className="sticky right-0 bg-surface-sunken px-3 py-2 font-bold"
              >
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {visible.map((report) => (
              <tr
                key={report.no}
                // Klik baris hanya kemudahan mouse — sengaja TANPA tabindex.
                // Kontrol sungguhan adalah tombol Detail di kolom terakhir,
                // supaya tidak ada dua tab stop untuk satu aksi.
                onClick={() => setSelected(report)}
                // bg-surface eksplisit supaya sel Detail yang sticky punya latar
                // solid saat baris di bawahnya lewat di belakangnya.
                className="cursor-pointer border-t border-line bg-surface hover:bg-sky-50/60"
              >
                {/* Nomor entri dari sheet, BUKAN posisi baris. Karena daftar
                    diurutkan menurut tanggal, angkanya melompat-lompat — dan
                    memang itu yang diinginkan: tiap baris harus bisa
                    dicocokkan langsung ke spreadsheet. */}
                <td className="px-3 py-2.5 align-top tabular-nums text-ink-muted">
                  {report.no}
                </td>

                <td className="px-3 py-2.5 align-top whitespace-nowrap tabular-nums">
                  {report.tanggalMasuk ? formatLong(report.tanggalMasuk) : "—"}
                </td>

                <td className="px-3 py-2.5 align-top">
                  <StatusBadge status={report.status} />
                </td>

                <td className="px-3 py-2.5 align-top">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {report.namaPelapor || "Tanpa nama"}
                    {report.perluVerifikasi && (
                      <span
                        title="Perlu verifikasi"
                        className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900"
                      >
                        cek
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {report.alamat || "Lokasi tidak tercatat"}
                  </span>
                  {/* Di bawah lg kolom Kanal disembunyikan, jadi badge-nya
                      ikut turun ke sini supaya warna kanal tetap terbaca. */}
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted lg:hidden">
                    <ChannelBadge channel={report.kanal} />
                    <span>{report.kategori}</span>
                  </span>
                </td>

                <td className="hidden px-3 py-2.5 align-top lg:table-cell">
                  <ChannelBadge channel={report.kanal} />
                </td>

                <td className="hidden px-3 py-2.5 align-top lg:table-cell">
                  {report.kategori || "—"}
                </td>

                <td className="sticky right-0 bg-inherit px-3 py-2.5 text-right align-top">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(report);
                    }}
                    className="min-h-11 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-regal-blue hover:bg-surface-sunken"
                  >
                    Detail
                    <span className="sr-only"> {report.namaPelapor}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <div className="px-4 py-12 text-center">
          <strong className="block">Belum ada entri yang cocok</strong>
          <span className="mx-auto mt-1 block max-w-md text-xs text-ink-muted">
            Ubah kata pencarian atau hapus filter status untuk menampilkan kembali data.
          </span>
        </div>
      )}

      <ReportDetailDialog report={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
