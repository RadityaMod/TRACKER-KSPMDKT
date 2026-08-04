# TRACKER-KSPMDKT

Dashboard pelacakan laporan dan aspirasi masyarakat untuk **KSP Mendekat**.
Membaca langsung dari Google Sheets sebagai satu-satunya sumber kebenaran.

## ⚠️ Data sensitif

Sheet sumber memuat **nomor telepon, NIK, dan alamat rumah** orang yang
melapor soal oknum kepolisian, TNI, dan pejabat daerah. Beberapa entri
menyangkut pelajar dan keluarga rentan.

Konsekuensinya:

- **Aplikasi ini belum punya autentikasi.** Jalankan hanya di `localhost`.
  Men-deploy-nya sekarang sama dengan mempublikasikan seluruh dataset.
- Snapshot data, tangkapan layar spreadsheet, dan berkas `.env` **tidak pernah
  di-commit** — lihat `.gitignore`. Jangan mengubah aturan itu.
- Fixture test memakai nomor sintetis, bukan nomor pelapor sungguhan.

## Menjalankan

```bash
cd web
npm install
npm run dev
```

Buka <http://localhost:3000>. Label di header menunjukkan sumber aktif:
`Google Sheets` bila kredensial terpasang, `CSV lokal` bila tidak.

### Menyambungkan ke Google Sheets

1. Buat service account di GCP, aktifkan **Google Sheets API**, unduh kunci JSON.
2. Bagikan sheet ke `client_email` service account itu sebagai **Viewer**.
3. Tulis `.env.local`:

   ```bash
   node scripts/setup-env.mjs <path-ke-kunci.json> <SHEET_ID> "'Nama Tab'!A:N"
   ```

4. Restart `npm run dev`.

Tanpa `.env.local`, aplikasi memakai `web/data/laporan.csv` — file itu
di-gitignore, jadi tidak ada di clone bersih dan aplikasi akan menampilkan
halaman error yang menjelaskan penyebabnya.

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan (tanpa cache — tiap muat halaman ambil dari Sheets) |
| `npm run build` | Build produksi |
| `npm start` | Jalankan hasil build (cache ISR 5 menit aktif) |
| `npm test` | 79 test unit |

## Kesegaran data

| Situasi | Kapan terbarui |
|---|---|
| Dev + refresh browser | Langsung |
| Produksi, dibiarkan | Maksimal 5 menit (ISR) |
| Produksi + tombol Refresh | Langsung (`revalidatePath`) |

Halaman tidak menyegarkan dirinya sendiri — perlu muat ulang atau klik Refresh.

## Struktur

```
web/src/
  lib/data/
    source.ts        Pemilihan sumber (Sheets / CSV lokal)
    google-sheet.ts  Klien Sheets API + pemetaan error
    schema.ts        Pemetaan nama kolom → tipe (menerima alias)
    csv.ts           Parser CSV quote-aware
    date.ts          Parsing DD/MM/YYYY eksplisit
    metrics.ts       Logika status (aman untuk komponen klien)
    traffic.ts       Agregasi harian
    filter.ts        Cari / sortir / filter
  components/        Tabel, dialog detail, grafik, metrik
  app/               Route, Server Action refresh
```

Batas penting: hanya `lib/data/schema.ts` yang tahu nama kolom sheet, dan
hanya `lib/data/` yang tahu dari mana data berasal.

## Dokumentasi

Desain lengkap, keputusan, dan daftar yang belum dikerjakan ada di
[`docs/superpowers/specs/`](docs/superpowers/specs/).

## Status

Selesai: koneksi Sheets, cache + refresh manual, metrik, grafik traffic,
pencarian, sortir, filter, modal detail, penanganan error, 79 test.

Belum: **autentikasi** (pemblokir deploy), test E2E/a11y, ESLint, fixture test
ter-mask.
