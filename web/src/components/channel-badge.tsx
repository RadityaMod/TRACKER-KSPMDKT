/**
 * Badge kanal masuknya laporan.
 *
 * Warna dipakai sebagai penanda cepat saat memindai tabel: WhatsApp hijau,
 * OCA merah, Surat kuning. Kanal lain jatuh ke netral alih-alih dipaksa masuk
 * salah satu warna — kalau nanti muncul kanal baru di sheet, ia tampil apa
 * adanya, bukan menyaru jadi kanal yang salah.
 */

export type ChannelTone = "whatsapp" | "oca" | "surat" | "netral";

export function channelTone(value: string): ChannelTone {
  const normalized = value.trim().toLowerCase();
  if (normalized === "whatsapp" || normalized === "wa") return "whatsapp";
  if (normalized === "oca") return "oca";
  if (normalized === "surat") return "surat";
  return "netral";
}

const TONE_CLASS: Record<ChannelTone, string> = {
  whatsapp: "bg-emerald-50 text-emerald-800",
  oca: "bg-rose-50 text-rose-800",
  /*
    Kuning dipakai pada nada gelap (amber-800), bukan kuning murni: kuning
    terang di atas latar terang tidak lolos rasio kontras teks kecil. Nada
    ini juga sudah dipakai status-badge, jadi bahasa warnanya tetap satu.
  */
  surat: "bg-amber-50 text-amber-800",
  netral: "bg-surface-sunken text-ink-muted",
};

export function ChannelBadge({
  channel,
  className = "",
}: {
  channel: string;
  className?: string;
}) {
  const tone = channelTone(channel);

  return (
    <span
      className={`inline-flex w-max items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      {/* Titik warna: pembeda yang tetap terbaca bagi pengguna buta warna,
          karena bentuk dan teksnya tetap ada di samping warna. */}
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {channel || "—"}
    </span>
  );
}
