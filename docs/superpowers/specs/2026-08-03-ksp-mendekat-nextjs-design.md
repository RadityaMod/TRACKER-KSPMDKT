# Desain: KSP Mendekat Tracker — Aplikasi Next.js

**Tanggal:** 2026-08-03 (diperbarui 2026-08-04)
**Status:** Terimplementasi — tersambung ke Google Sheets
**Menggantikan:** `Dashboard_Pelapor_OCA_Local.html` (single-file, 101 entri)

---

## 0. Keadaan Saat Ini (per 2026-08-04)

Aplikasi berjalan di `web/`, membaca langsung dari Google Sheets.

| Aspek | Keadaan |
|---|---|
| Sumber data | Google Sheets, service account, **aktif** |
| Spreadsheet | TRACKER PELAPOR KSP MENDEKAT |
| Tab | `Tracker Pelapor KSP Mendekat` (A:N, 14 kolom) |
| Jumlah entri | 103 |
| Cache | ISR 5 menit + tombol Refresh (`revalidatePath`) |
| Grafik | shadcn/ui + Recharts, lebar penuh, sumbu tanggal |
| Test | 79 (64 + 15 yang butuh snapshot lokal) |
| Auth | **BELUM ADA** — lihat §11 |

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
5. **Auth belum dikerjakan.** Ini gap terbesar — lihat §11.

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
- Data PII hanya bisa diakses staf yang sudah login
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
| Akses | Wajib login, data lengkap | PII tidak boleh terekspos anonim |
| Auth | Auth.js v5, Google provider + allowlist email | Staf sudah punya akun Google (mereka pakai Sheets) |
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

```
web/src/
  lib/sheets/
    client.ts        # JWT auth → sheets_v4 client. Satu-satunya file yang tahu soal Google.
    schema.ts        # Zod: baris mentah → Report bertipe. Pemilik pemetaan nama kolom.
    reports.ts       # getReports(): 'use cache' + cacheTag + cacheLife. Satu-satunya entry publik.
    date.ts          # Parsing DD/MM/YYYY (lihat 5.2)
  lib/auth.ts        # Konfigurasi Auth.js: Google provider + signIn allowlist callback
  app/
    (dashboard)/     # route group ber-auth
      page.tsx       # Server Component: auth() → getReports() → render
      actions.ts     # Server Action: refreshReports()
    login/page.tsx
    api/auth/[...nextauth]/route.ts
  components/        # presentational, tanpa akses data
    reports-table.tsx
    report-detail-dialog.tsx
    traffic-chart.tsx
    metrics-row.tsx
```

**Batas yang penting:** tidak ada apa pun di luar `lib/sheets/` yang tahu nama
kolom sheet. `schema.ts` memetakan `"Status Tindak Lanjut"` → `status` satu kali.
Di HTML lama, `cell(row, "Status Tindak Lanjut")` tersebar di enam fungsi —
mengganti nama kolom di Sheets berarti berburu ke seluruh markup.

### 4.3 Alur Data

```
Server Component
  → auth()                       ← DI LUAR cache
  → getReports()                 ← 'use cache', cacheTag('reports'), cacheLife(...)
      → JWT(service account, spreadsheets.readonly)
      → sheets.spreadsheets.values.get()
      → Zod parse → Report[]
  → <ReportsTable rows={...} />  ← client component, filtering in-memory
```

Dua detail kebenaran yang dikunci desain ini:

1. **`auth()` berada di LUAR fungsi ber-cache.** Jika pengecekan sesi ada di
   dalam `use cache`, hasil otorisasi satu user akan ter-cache dan tersaji ke
   user berikutnya. Cache hanya berisi data sheet — tidak pernah sesuatu yang
   spesifik per-user.
2. **`getReports()` mengembalikan SEMUA baris tanpa filter.** Filtering adalah
   fungsi murni di client component, sehingga satu entri cache dipakai bersama
   semua staf, bukan terpecah per query.

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
| User tidak di allowlist | Halaman "akses ditolak" yang jelas, bukan loop redirect diam |

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
| Allowlist auth | Vitest | Email di/tidak di list, case-insensitive, `email_verified` false |
| Halaman ber-auth | Playwright | Anonim di-redirect; user allowlist melihat data |
| A11y | axe via Playwright | Tanpa violation di halaman utama dan modal terbuka |

Logika murni (parsing, agregasi, filter) sengaja diletakkan di luar komponen
supaya bisa diuji tanpa render.

**Fixture:** salinan sheet yang sudah di-mask (pola `62•• •••• 3389` seperti
`public/data/laporan-ksp-mendekat.csv` yang sudah ada). **Tidak ada PII nyata di
file test.**

---

## 9. Keamanan & PII

- Sheet tetap privat; dibagikan ke email service account sebagai Viewer
- Kredensial hanya di env vars server-side, tidak pernah `NEXT_PUBLIC_*`
- `Dashboard_Pelapor_OCA_Local.html` masuk `.gitignore` (109 nomor telpon, 3 NIK)
- Fixture test memakai data ter-mask
- Halaman ber-auth memakai `export const dynamic = 'force-dynamic'`
- Header `noindex` pada seluruh route ber-auth

**Risiko yang diterima secara sadar:** Approach A mengirim seluruh 101 baris —
termasuk nomor telpon dan NIK — ke setiap browser yang terautentikasi. Ini
konsisten dengan keputusan "login, data lengkap", tapi berarti payload hanya
seaman allowlist-nya. Bila nanti perlu lebih ketat, jalan keluarnya adalah
Approach B (filter di server) atau masking per-peran.

### Environment Variables

| Var | Kegunaan |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON service account penuh, di-parse saat runtime |
| `SHEET_ID` | ID spreadsheet |
| `SHEET_RANGE` | Tab + rentang, mis. `Sheet1!A:N` |
| `AUTH_SECRET` | Signing sesi Auth.js |
| `AUTH_GOOGLE_ID` | OAuth client ID |
| `AUTH_GOOGLE_SECRET` | OAuth client secret |
| `ALLOWED_EMAILS` | Allowlist staf, dipisah koma |

---

## 10. Rencana Implementasi

| Fase | Isi | Selesai bila |
|---|---|---|
| 0 | Scaffold `web/`, TS, Tailwind 4, Vitest, Playwright, `cacheComponents: true` | `npm run build` dan `npm test` hijau |
| 1 | `lib/sheets/` — client, schema, date, reports + unit test | Test parsing & schema lulus dengan fixture ter-mask |
| 2 | Auth.js + allowlist + halaman login + proteksi route | Anonim di-redirect; non-allowlist ditolak |
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

### 🔴 Auth belum ada — pemblokir deploy

Keputusan di §3 adalah **wajib login, data lengkap**. Itu belum dikerjakan.
Aplikasi saat ini menyajikan 103 nomor telepon, NIK, dan alamat rumah kepada
siapa pun yang bisa mencapai halamannya.

Selama berjalan di `localhost` ini aman. **Men-deploy-nya tanpa auth sama saja
dengan mempublikasikan seluruh dataset.** Fase 2 (Auth.js + Google provider +
`ALLOWED_EMAILS`) harus selesai sebelum deploy ke mana pun.

### Lainnya

1. **Daftar email staf** — siapa saja yang masuk `ALLOWED_EMAILS`?
2. **Target deploy** — Vercel, atau host Node lain?
3. **Cutover** — kapan `/dashboard.html` lama dan `vercel-dashboard/`
   dipensiunkan? Keduanya masih memuat PII tanpa auth.
4. **Status di luar `Baru`** — seluruh 103 baris masih `Baru`, jadi warna badge
   untuk status lain belum pernah terlihat dengan data nyata.
5. **Fixture test ter-mask** — §8 menetapkan fixture ter-mask, tapi test data
   nyata masih membaca snapshot ber-PII yang kini di-gitignore. Test itu
   di-skip di clone bersih. Fixture ter-mask sungguhan masih pekerjaan lanjutan.
6. **Akses publik sheet** — belum dikonfirmasi apakah sheet masih terbuka untuk
   "anyone with the link". Service account tidak membutuhkannya.

---

## 12. Referensi

- Next.js 16 `use cache` / `cacheLife` / `cacheTag` / `revalidateTag`
  (via Context7 `/vercel/next.js/v16.2.9`)
- Auth.js Google provider + `signIn` callback allowlist
  (via Context7 `/nextauthjs/next-auth`)
- google-auth-library JWT dari env var
  (via Context7 `/googleapis/google-auth-library-nodejs`)
