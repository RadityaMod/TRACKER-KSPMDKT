# Desain: KSP Mendekat Tracker — Aplikasi Next.js

**Tanggal:** 2026-08-03 (diperbarui 2026-08-06)
**Status:** Terimplementasi — tersambung ke Google Sheets
**Menggantikan:** `Dashboard_Pelapor_OCA_Local.html` (single-file, 101 entri)

---

## 0. Keadaan Saat Ini (per 2026-08-06)

Aplikasi berjalan di `web/`, membaca langsung dari Google Sheets.

| Aspek | Keadaan |
|---|---|
| Sumber data | Google Sheets, service account, **aktif** |
| Spreadsheet | TRACKER PELAPOR KSP MENDEKAT |
| Tab | `Tracker Pelapor KSP Mendekat` (dibaca A:Z agar penambahan kolom tidak memotong data) |
| Jumlah entri | 103 |
| Cache | ISR 5 menit + tombol Refresh (`revalidatePath`) |
| Grafik | shadcn/ui + Recharts, lebar penuh, sumbu tanggal |
| Test | Unit/integration auth + data, Playwright E2E, dan axe |
| Auth | Shared PIN, signed cookie, proxy, dan rate limit best-effort |

**Perbedaan dari rencana awal:**

1. **Mode public CSV pernah ditambahkan lalu dihapus.** Mode itu mensyaratkan
   sheet dibuka untuk "anyone with the link", yang membatalkan seluruh alasan
   memilih service account. Hanya service account yang tersisa.
2. **Fallback ke CSV lokal jadi opt-in** (`ALLOW_LOCAL_FALLBACK`, default mati)
   dan menampilkan banner merah. Fallback diam-diam berbahaya: snapshot lokal
   beku, jadi salah ketik `SHEET_RANGE` akan membuat dashboard tampak normal
   sambil menyajikan data usang.
3. **Nama kolom kini menerima alias.** Google Sheet memakai `No. Telpon`,
   snapshot CSV lokal `No. Telepon`. Memilih salah satu mengosongkan kolom itu
   di sumber lain — kegagalan diam-diam yang sudah pernah terjadi.
4. **Caching pakai ISR (`export const revalidate`)**, bukan `use cache` +
   `cacheComponents`. Lebih sederhana dan cukup untuk kebutuhan sekarang.
5. **Shared PIN gate sudah aktif.** Model ini dipilih untuk tool internal; URL Vercel tetap internet-reachable sehingga PIN kuat, secret terpisah, dan proteksi perimeter tetap diperlukan.

---

## 1. Latar Belakang

Dashboard saat ini adalah satu file HTML 90 KB dengan CSV ter-embed di dalam
`<script>`. File ini berfungsi, tetapi punya beberapa masalah nyata:

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | Baris tabel punya `cursor:pointer`, hover, dan `:focus-visible`, tapi tanpa click handler dan tanpa `tabindex` | Pengguna desktop mengklik baris dan tidak terjadi apa-apa |
| 2 | `role="listitem"` tanpa parent `role="list"` | Screen reader membaca list item yatim |
| 3 | Data PII lengkap di file untracked, tidak masuk `.gitignore` | Satu `git add .` memasukkan 109 nomor telpon + 3 NIK ke history permanen |
| 4 | Semua 101 baris berstatus `Baru` | 3 dari 4 KPI tile permanen nol; filter status hanya punya 1 opsi nyata |
| 5 | Grafik traffic diperpanjang sampai hari ini | Garis terjun ke nol selama 6 hari kosong setelah entri terakhir |
| 6 | 5 blok `@media(max-width:700px)` bertumpuk dengan `!important` | Sangat sulit dirawat |

Update data juga manual: ekspor Sheets → CSV → tombol "Muat CSV terbaru". Tidak
ada satu sumber kebenaran yang hidup.

---

## 2. Tujuan / Bukan Tujuan

### Tujuan

- Aplikasi Next.js yang membaca langsung dari Google Sheets sebagai satu-satunya
  sumber kebenaran
- Data PII hanya bisa diakses staf yang sudah membuka shared PIN gate
- Feature parity dengan dashboard lama: metrik, grafik traffic, cari, sortir,
  filter status, modal detail
- Memperbaiki keenam masalah di tabel atas
- Tampilan memakai palet dari `Color Pallet.jpeg`

### Bukan Tujuan (YAGNI)

- **Tidak** menulis balik ke Sheets — read-only. Staf tetap mengedit di Sheets.
- **Tidak** pakai Supabase atau database apa pun. Sheets adalah database-nya.
- **Tidak** ada editing per-field, audit trail, atau manajemen user in-app.
- **Tidak** ada dukungan offline / PWA.
- **Tidak** memindahkan deploy vinext/Cloudflare yang sekarang — biarkan jalan
  sampai cutover disepakati.

---

## 3. Keputusan yang Sudah Dikunci

| Aspek | Keputusan | Alasan |
|---|---|---|
| Runtime | Next.js 16 App Router standar, proyek baru | `vinext` 0.0.50 pre-1.0, tidak mendukung seluruh permukaan Next.js |
| Bahasa | TypeScript | Skema data punya 14 kolom; tipe mencegah salah nama kolom |
| Styling | Tailwind CSS 4 | Menghapus 5 blok `!important` bertumpuk |
| Akses | Wajib membuka shared PIN gate, data lengkap | PII tidak boleh terekspos anonim |
| Auth | Satu shared PIN internal + signed cookie | Sesuai keputusan operasional untuk tool internal; tidak mengelola akun individual |
| Sumber data | Sheets API v4 + service account | Sheet tetap privat; tidak ada URL publik berisi PII |
| Ruang lingkup | Read-only | Scope terkecil yang aman |
| Cache | 5 menit + tombol refresh manual | Hemat kuota API, tetap bisa dipaksa segar |
| Alur data | Server fetch → tabel sisi klien | 101 baris ≈ 90 KB, filtering instan tanpa round-trip |

---

## 4. Arsitektur

### 4.1 Lokasi

Direktori baru `web/` di dalam repo ini. Git history tetap, `public/data`
referensi tetap, dan starter vinext di root tidak disentuh sehingga deploy
OpenAI Sites yang sekarang tetap hidup sampai cutover.

### 4.2 Struktur Modul

```text
web/src/
  proxy.ts                 # Proteksi route privat sebelum request diteruskan
  lib/auth/
    pin.ts                 # Validasi PIN dan signed session cookie
    rate-limit.ts          # Lockout best-effort per instance/IP
  lib/data/                # Sheets/CSV, schema, parsing, metrik, filter
  app/
    page.tsx               # Dashboard privat
    pin/page.tsx           # Shared PIN gate
    api/pin/unlock/        # Verifikasi PIN dan terbitkan cookie
    api/pin/logout/        # Hapus cookie
  components/              # Tabel, dialog, grafik, metrik
```

`src/proxy.ts` berada sejajar dengan `src/app`, mengikuti konvensi Next.js 16.
Route `/pin`, `/api/pin/*`, dan asset framework bersifat publik; route lain
memerlukan signed cookie yang valid.

**Batas yang penting:** hanya `lib/data/` yang mengetahui sumber dan nama kolom
sheet. `schema.ts` memetakan nama kolom ke model `Report` satu kali.

### 4.3 Alur Data dan Akses

```text
Request
  → src/proxy.ts memverifikasi signed cookie
      → tidak valid: redirect /pin?redirectTo=...
      → valid: dashboard mengambil getReports()
          → Sheets API dengan service account
          → validasi schema → Report[]
          → ReportsTable memfilter/sortir di browser
```

Form PIN mengirim POST ke `/api/pin/unlock`. PIN benar menerbitkan cookie
`HttpOnly`, `SameSite=Lax`, `Secure` di production selama tujuh hari. PIN salah
dicatat per alamat IP; lima kegagalan dalam 15 menit memicu lockout sementara.
Keberhasilan unlock mereset hitungan. Logout menghapus cookie.

Rate limiter in-memory adalah mitigasi best-effort per instance, bukan limit
global lintas region/serverless instance. Vercel Firewall/WAF tetap menjadi
lapisan perimeter yang direkomendasikan.

`getReports()` mengembalikan semua baris tanpa filter. Filtering tetap fungsi
murni di client agar satu hasil cache dapat dipakai semua sesi internal.
### 4.4 Caching

```ts
cacheLife({ stale: 60, revalidate: 300, expire: 900 })
```

Tombol Refresh adalah Server Action yang memanggil
`revalidateTag('reports', 'max')` — stale-while-revalidate, jadi klik tidak
pernah memblokir menunggu Sheets.

`use cache` memerlukan `cacheComponents: true` di `next.config.ts` (nama baru
Next 16 untuk flag `dynamicIO` lama).

---

## 5. Model Data

### 5.1 Pemetaan Kolom

Sheet punya 14 kolom. `schema.ts` memetakan seluruhnya:

| Kolom Sheet | Field | Tipe | Catatan |
|---|---|---|---|
| `No` | `no` | `number` | |
| `Tanggal Masuk` | `tanggalMasuk` | `DateOnly` | DD/MM/YYYY |
| `Kanal` | `kanal` | `"WhatsApp" \| "OCA" \| string` | 93 OCA / 8 WhatsApp |
| `Nama Pelapor` | `namaPelapor` | `string` | |
| `Kontak WA / ID Chat` | `kontakWa` | `string` | **PII** |
| `No. Telpon` | `noTelpon` | `string` | **PII** |
| `Alamat` | `alamat` | `string` | **PII** |
| `Status Pelapor` | `statusPelapor` | `string` | |
| `Kategori Aduan` | `kategori` | `string` | |
| `Ringkasan Aspirasi` | `ringkasan` | `string` | Bisa memuat NIK — **PII** |
| `Lampiran` | `lampiran` | `string` | |
| `Status Tindak Lanjut` | `status` | `string` | |
| `Tanggal Update Terakhir` | `tanggalUpdate` | `DateOnly` | DD/MM/YYYY |
| `Catatan` | `catatan` | `string` | |

Validasi memakai **header names**, bukan indeks posisi, supaya menambah kolom di
Sheets tidak merusak aplikasi. Jika ada kolom wajib hilang, `getReports()`
melempar error yang bisa dibaca — bukan diam-diam merender kolom kosong.

### 5.2 Parsing Tanggal — Jebakan Nyata

Data memakai **DD/MM/YYYY**. `new Date("03/06/2026")` di JavaScript diparse
sebagai **6 Maret**, bukan 3 Juni. Ini akan merusak grafik traffic secara diam-
diam dan sulit terdeteksi karena sebagian tanggal tetap masuk akal.

`date.ts` mem-parse secara eksplisit dengan regex `^(\d{1,2})/(\d{1,2})/(\d{4})$`
dan mengembalikan tipe `DateOnly` (string `YYYY-MM-DD`), tanpa pernah menyentuh
`Date` untuk parsing. Ini akan diuji langsung (lihat §8).

### 5.3 Kualitas Data yang Sudah Diketahui

**11 baris** membawa catatan `PERLU VERIFIKASI` / `DUPLIKAT` di kolom `Catatan`:
entri no. 4, 5, 9, 10, 20, 22, 23, 25, 26, 40, dan 63. (Angka 7 yang sempat
disebut lebih awal keliru — `grep` waktu itu melewatkan varian huruf kecil
"perlu verifikasi".)

Deteksi sengaja dibatasi ke kolom `Catatan` saja. Entri no. 43 memuat kata
"duplikat" di dalam `Ringkasan Aspirasi` — soal BPKB palsu yang bisa
diterbitkan — dan itu isi laporan, bukan penanda kualitas data. Kalau
pengecekan dilakukan ke seluruh baris, entri itu ikut tertandai keliru.

Isi masalahnya (nomor dan nama sengaja tidak ditulis di sini — dokumen ini
ter-commit ke repo, sedangkan datanya menyangkut pelapor yang mengadukan oknum
aparat; rujuk nomor entri lalu buka sheet-nya):

- Satu nomor telepon tercatat untuk **3 pelapor berbeda** (entri no. 9, 10,
  dan 22) — catatan sumber menduga kebocoran nomor antar panel View Details
- Entri no. 25 dan 26 identik kecuali ejaan namanya
- Entri no. 20 memuat teks aspirasi identik dengan sengketa lahan di entri
  no. 22, padahal alamat pelapornya berbeda provinsi

Aplikasi **tidak** memperbaiki ini secara otomatis. Rencana: tampilkan badge
peringatan di modal detail bila `catatan` memuat `PERLU VERIFIKASI` atau
`DUPLIKAT`, supaya staf melihatnya saat membuka entri.

---

## 6. Lapisan UI

### 6.1 Design Tokens

Diambil dari `Color Pallet.jpeg`, sebagai CSS variables di `@theme` Tailwind 4:

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-regal-blue` | `#03355E` | Header, teks utama |
| `--color-endless-sky` | `#024C7B` | Header modal, aksen gelap |
| `--color-smothe-blue` | `#0796D7` | Aksi primer, garis grafik |
| `--color-royal-light-blue` | `#8DC8EF` | Fill area grafik, highlight |
| `--color-white-sand` | `#EDEAE5` | Background halaman |
| `--color-smooth-white` | `#DCD8D2` | Permukaan kartu |
| `--color-slient-grey` | `#D2D3CC` | Border, garis pemisah |
| `--color-cute-silver` | `#E3E6EB` | Baris zebra / hover |

**Catatan:** beberapa label di JPEG salah. "Icy Grey" ditulis `#FFE8DB` (warna
peach) padahal swatch-nya biru keabuan; "Dark Graphic", "Authentic Black", dan
"Old Grey" ketiganya ditulis `#08080C` padahal tiga nada berbeda. Nilai netral
gelap akan di-sample ulang dari piksel saat implementasi, tidak mengikuti label.

Kontras teks-di-atas-background akan dicek terhadap WCAG AA (4.5:1) sebelum
token dikunci.

### 6.2 Komponen

| Komponen | Jenis | Tanggung jawab |
|---|---|---|
| `MetricsRow` | Server | 4 KPI tile dari agregat |
| `TrafficChart` | Client | SVG line+area, tooltip, keyboard-navigable |
| `ReportsTable` | Client | Cari / sortir / filter, render baris |
| `ReportDetailDialog` | Client | `<dialog>` native, 3 seksi field |
| `RefreshButton` | Client | Memanggil Server Action, pending state |

### 6.3 Perbaikan Bug yang Dibawa

1. **Klik baris** — dipakai pola berikut, dan hanya pola ini:
   - `<tr>` diberi `onClick` sebagai **kemudahan mouse saja** — tanpa
     `tabindex`, tanpa `role`.
   - Kontrol sungguhan tetap `<button>` di sel Detail. Itulah yang menerima
     fokus keyboard dan dibaca screen reader.

   Alasannya: memberi `tabindex` pada baris *sekaligus* menyimpan `<button>` di
   dalamnya akan menghasilkan dua tab stop untuk satu aksi, dan kontrol
   interaktif bersarang. Pola ini memperbaiki afordansi yang menyesatkan tanpa
   menciptakan masalah a11y baru.
2. **Semantik tabel** — pakai `<table>` sungguhan dengan `<th scope="col">`,
   bukan grid `<div>` + `role="list"`. Data ini memang tabular; `<table>`
   memberi semantik screen-reader gratis dan `aria-sort` yang benar pada header.
   Ini sekaligus menghapus masalah `role="listitem"` yatim.
3. **Ekor nol grafik** — sumbu berhenti di tanggal data terakhir. Jika ada gap
   hari tanpa laporan di tengah rentang, tetap digambar nol (itu informasi
   nyata); yang dihapus hanya ekor setelah entri terakhir.
4. **Filter status** — tetap dirender, tapi bila hanya ada satu nilai unik
   tampilkan hint "semua entri berstatus Baru" alih-alih dropdown mati.
5. **Responsif** — dibangun ulang mobile-first dengan Tailwind, tanpa
   `!important`.

### 6.4 State Filter di URL

State cari/sortir/filter dicerminkan ke URL lewat `useSearchParams` +
`replaceState` (tanpa navigasi server). Tampilan jadi bisa dibagikan tanpa
membayar round-trip.

---

## 7. Error Handling

| Kondisi | Perilaku |
|---|---|
| Env var hilang | Gagal saat startup dengan pesan menyebut nama var — bukan error runtime samar |
| Sheets API 403 | Halaman error: "Service account belum punya akses ke sheet" + email service account |
| Sheets API 429 / 5xx | Sajikan data cache yang stale bila ada, dengan banner "data mungkin belum terbaru"; bila cache kosong, halaman error dengan tombol retry |
| Kolom wajib hilang | Halaman error menyebut kolom mana yang hilang |
| Baris gagal parse | Baris di-skip, dihitung, dan ditampilkan sebagai banner peringatan — satu baris rusak tidak boleh menjatuhkan seluruh halaman |
| Sheet kosong | Empty state, bukan crash |
| PIN salah / limit tercapai | Pesan jelas; lima kegagalan per IP dikunci 15 menit |

Prinsip: **kegagalan sebagian tidak boleh jadi kegagalan total.** Dashboard lama
memuat seluruh CSV atau tidak sama sekali.

---

## 8. Testing

| Lapisan | Alat | Cakupan |
|---|---|---|
| Parsing tanggal | Vitest | DD/MM/YYYY vs MM/DD ambigu, tanggal invalid, string kosong |
| Zod schema | Vitest | Kolom hilang, baris rusak, kolom ekstra, sel kosong |
| Agregasi metrik | Vitest | Perhitungan Total/Baru/Proses/Selesai |
| Bucket traffic | Vitest | Gap hari, entri sehari banyak, ekor tidak diperpanjang |
| Filter/sortir | Vitest | Fungsi murni, terpisah dari komponen |
| Shared PIN + proxy | Vitest | Cookie, redirect, PIN benar/salah, logout, dan rate limit |
| Flow akses | Playwright | Anonim di-redirect; PIN valid membuka dashboard; logout mengunci kembali |
| A11y | axe via Playwright | PIN, dashboard, dan modal tanpa violation serius/kritis |

Logika murni (parsing, agregasi, filter) sengaja diletakkan di luar komponen
supaya bisa diuji tanpa render.

**Fixture:** dataset sintetis kecil di `tests/fixtures/laporan-e2e.csv`. **Tidak ada PII nyata di file test.**

---

## 9. Keamanan & PII

- Sheet tetap privat dan hanya dibagikan ke service account sebagai Viewer.
- Kredensial dan PIN hanya berada di env server-side, bukan `NEXT_PUBLIC_*`.
- Shared PIN dipilih secara sadar untuk tool internal; ini bukan identitas
  individual dan tidak memberi audit per pengguna.
- URL Vercel tetap dapat dijangkau dari internet. Gunakan PIN kuat,
  `DASHBOARD_PIN_SECRET` acak yang berbeda dari PIN, Deployment Protection
  selama rollout, serta Vercel Firewall/WAF bila diperlukan.
- Signed cookie memakai `HttpOnly`, `SameSite=Lax`, `Secure` di production, dan
  masa berlaku tujuh hari.
- Lima PIN salah dalam 15 menit dikunci best-effort per IP/per instance.
- Fallback CSV production mati secara default; snapshot PII tidak boleh ikut
  bundle atau Git.
- Fixture Playwright memakai data sintetis tanpa PII nyata.
- Header `noindex` berlaku untuk aplikasi.

**Risiko yang diterima secara sadar:** seluruh baris, termasuk PII, dikirim ke
browser setelah shared PIN berhasil. Siapa pun yang mengetahui PIN memiliki
akses yang sama dan aktivitasnya tidak dapat diatribusikan ke individu. Jika
kebutuhan audit atau pemisahan akses meningkat, migrasikan ke SSO/allowlist
individual dan pertimbangkan masking atau filter server-side.

### Environment Variables

| Var | Kegunaan |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON service account penuh, server-side |
| `SHEET_ID` | ID spreadsheet |
| `SHEET_RANGE` | Tab + rentang, mis. `Sheet1!A:Z` |
| `DASHBOARD_PIN` | Shared PIN internal yang kuat |
| `DASHBOARD_PIN_SECRET` | Secret acak terpisah untuk menandatangani sesi |
| `ALLOW_LOCAL_FALLBACK` | Opt-in CSV lokal; harus mati di production |

---
## 10. Rencana Implementasi

| Fase | Isi | Selesai bila |
|---|---|---|
| 0 | Scaffold `web/`, TS, Tailwind 4, Vitest, Playwright, `cacheComponents: true` | `npm run build` dan `npm test` hijau |
| 1 | `lib/sheets/` — client, schema, date, reports + unit test | Test parsing & schema lulus dengan fixture ter-mask |
| 2 | Shared PIN, signed cookie, proxy, dan rate limit | Anonim ditolak; test auth dan lockout lulus |
| 3 | Design tokens + app shell + cek kontras | Token terpakai, kontras AA lulus |
| 4 | `MetricsRow` + `ReportsTable` (cari/sortir/filter) + state URL | Parity dengan dashboard lama, klik baris berfungsi |
| 5 | `ReportDetailDialog` + badge PERLU VERIFIKASI | Semua field tampil, fokus ter-trap, Esc menutup |
| 6 | `TrafficChart` tanpa ekor nol | Rentang berhenti di data terakhir |
| 7 | Refresh Server Action + `revalidateTag` | Klik menyegarkan tanpa blocking |
| 8 | Error/empty state (§7) | Setiap baris tabel §7 terbukti |
| 9 | Sapuan a11y + Playwright + verifikasi akhir | axe bersih, E2E hijau |

Fase 1 dan 2 saling bebas dan bisa dikerjakan paralel. Fase 4–7 semuanya
bergantung pada Fase 1 dan 3.

---

## 11. Yang Masih Terbuka

### Gate deployment

Auth aplikasi sudah tersedia sebagai shared PIN sesuai keputusan operasional.
Sebelum cutover production:

1. Isi `DASHBOARD_PIN` yang kuat dan `DASHBOARD_PIN_SECRET` acak yang berbeda di
   Vercel, lalu redeploy.
2. Uji akses anonim, PIN salah/benar, logout, dan cookie langsung pada URL
   production.
3. Pertahankan Vercel Deployment Protection sampai pengujian tersebut lulus;
   setelahnya owner memutuskan apakah lapisan itu tetap dipakai.
4. Evaluasi Vercel Firewall/WAF untuk rate limit global karena limiter aplikasi
   hanya best-effort per serverless instance.
5. Pastikan `ALLOW_LOCAL_FALLBACK=false` dan sheet tidak publik.

### Lainnya

1. **Cutover** — tentukan kapan `/dashboard.html` lama dan
   `vercel-dashboard/` dipensiunkan; artefak lama tidak memakai gate Next.js.
2. **Status di luar `Baru`** — warna badge status lain belum tervalidasi dengan
   data production yang representatif.
3. **Model akses berikutnya** — bila dibutuhkan audit per orang, revocation, atau
   least privilege, ganti shared PIN dengan SSO dan allowlist individual.

---
## 12. Referensi

- Next.js 16 `proxy.ts` dan penempatan di dalam `src` bila aplikasi memakai
  `src/app` (dokumentasi resmi Next.js).
- Playwright `webServer` untuk menjalankan server lokal selama E2E.
- `@axe-core/playwright` untuk accessibility testing.
- google-auth-library JWT dari env var untuk akses Sheets.
