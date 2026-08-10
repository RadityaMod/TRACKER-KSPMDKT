import { isNew, isResolved } from "@/lib/data/metrics";

/**
 * Warna status.
 *
 * Catatan: seluruh 103 entri saat ini berstatus "Baru", jadi warna untuk
 * status lain belum pernah terlihat dengan data nyata. Nilai yang sah untuk
 * "Status Tindak Lanjut" masih pertanyaan terbuka di spec §11.
 */
function tone(status: string): string {
  const value = status.trim().toLowerCase();
  if (isResolved(value)) return "bg-emerald-50 text-emerald-800";
  if (isNew(value)) return "bg-sky-50 text-endless-sky";
  if (value.includes("menunggu")) return "bg-orange-50 text-orange-800";
  if (!value) return "bg-surface-sunken text-ink-muted";
  return "bg-amber-50 text-amber-900";
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex w-max items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${tone(status)}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {status || "Belum ditentukan"}
    </span>
  );
}
