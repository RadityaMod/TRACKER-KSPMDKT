# TRACKER-KSPMDKT

Dashboard pelacakan laporan dan aspirasi masyarakat untuk **KSP Mendekat**.
Aplikasi utama berada di `web/` dan membaca Google Sheets sebagai sumber
kebenaran produksi.

## ⚠️ Data sensitif dan akses internal

Sheet sumber memuat nomor telepon, NIK, alamat rumah, serta laporan tentang
oknum aparat dan pejabat. URL Vercel tetap dapat dijangkau melalui internet,
meskipun aplikasinya hanya ditujukan sebagai tool internal.

Kontrol akses yang berlaku:

- Dashboard dan endpoint privat dilindungi satu **shared PIN internal**.
- `src/proxy.ts` memverifikasi signed session cookie sebelum request diteruskan.
- Cookie bersifat `HttpOnly`, `SameSite=Lax`, `Secure` di production, dan berlaku
  tujuh hari.
- Lima kegagalan PIN dalam 15 menit dikunci sementara per alamat IP. Pembatas
  ini best-effort per instance; gunakan Vercel Firewall/WAF sebagai lapisan
  global bila endpoint menerima traffic yang tidak dipercaya.
- Gunakan PIN kuat dan simpan `DASHBOARD_PIN_SECRET` yang acak serta berbeda dari
  PIN. Jangan membagikan PIN di kanal publik.
- Snapshot data, tangkapan layar spreadsheet, dan berkas `.env` tidak boleh
  di-commit. Fixture test hanya memuat data sintetis.

Konfigurasi minimum di `web/.env.local`:

```bash
DASHBOARD_PIN="PIN-internal-yang-kuat"
DASHBOARD_PIN_SECRET="secret-acak-yang-berbeda-dari-PIN"
```

Di Vercel, kedua nilai wajib dikonfigurasi sebagai Environment Variables.
Pertahankan Vercel Deployment Protection sampai gate PIN sudah di-deploy dan
diuji pada URL production.

## Menjalankan

```bash
cd web
npm install
npm run dev
```

Buka <http://localhost:3000>. Label di header menunjukkan sumber aktif:
`Google Sheets` bila kredensial terpasang, `CSV lokal` bila fallback lokal
diizinkan.

### Menyambungkan ke Google Sheets

1. Buat service account di GCP, aktifkan **Google Sheets API**, lalu unduh kunci JSON.
2. Bagikan sheet ke `client_email` service account sebagai **Viewer**.
3. Tulis `.env.local`:

   ```bash
   node scripts/setup-env.mjs <path-ke-kunci.json> <SHEET_ID> "'Nama Tab'!A:N"
   ```

4. Tambahkan `DASHBOARD_PIN` dan `DASHBOARD_PIN_SECRET`, kemudian restart server.

Fallback CSV produksi mati secara default. `ALLOW_LOCAL_FALLBACK=true` hanya
untuk pengembangan lokal; jangan aktifkan pada Vercel karena snapshot dapat
memuat PII dan menjadi usang.

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm start` | Menjalankan hasil build |
| `npm run lint` | Lint source, test, dan konfigurasi tanpa memindai output `.next` |
| `npm test` | Unit/integration test termasuk auth dan rate limit |
| `npm run test:e2e` | Playwright: anonymous access, PIN, logout, axe, touch target |
| `npm run test:all` | Unit/integration lalu E2E |

## Kesegaran data

| Situasi | Kapan terbarui |
|---|---|
| Dev + refresh browser | Langsung |
| Produksi, dibiarkan | Maksimal 5 menit (ISR) |
| Produksi + tombol Refresh | Langsung (`revalidatePath`) |

## Struktur

```text
web/src/
  proxy.ts           Proteksi route privat dengan signed cookie
  lib/auth/           Token PIN dan rate limiter
  lib/data/           Sheets/CSV, schema, parsing, metrik, filter
  components/         Tabel, dialog detail, grafik, metrik
  app/                Dashboard, PIN gate, dan endpoint auth/data
web/tests/             Unit/integration test
web/e2e/               Playwright + axe
```

## Dokumentasi

Desain lengkap dan keputusan keamanan ada di
[`docs/superpowers/specs/`](docs/superpowers/specs/).

## Status

Selesai: koneksi Sheets, fallback lokal opt-in, cache + refresh manual, metrik,
grafik, pencarian/sortir/filter, modal detail, shared PIN gate, signed cookie,
rate limit best-effort, unit/integration test auth, Playwright/axe, touch target,
dan konfigurasi lint yang mengabaikan output build.

Sebelum cutover production: isi environment Vercel, redeploy, uji gate PIN pada
URL production, lalu putuskan apakah Deployment Protection tetap dipertahankan.