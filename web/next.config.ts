import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo induk punya package-lock.json sendiri (starter vinext). Tanpa ini
  // Turbopack memilih root yang salah dan memperingatkan soal lockfile ganda.
  turbopack: { root: import.meta.dirname },

  // Data lokal saat ini dibaca dari filesystem, jadi belum ada yang perlu
  // di-cache lintas request. Saat sumber pindah ke Google Sheets, aktifkan
  // `cacheComponents: true` di sini lalu tambahkan 'use cache' di
  // src/lib/data/reports.ts — lihat catatan di file itu.
};

export default nextConfig;
