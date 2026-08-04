# KSP Mendekat Tracker - Vercel

Folder ini adalah versi deploy-ready untuk Vercel.

## Isi folder

- `index.html` - dashboard KSP Mendekat.
- `api/data.js` - proxy aman dari dashboard ke Google Sheets Apps Script.
- `google-apps-script.gs` - template Apps Script untuk ditempel di Google Sheets.
- `.env.example` - contoh environment variable Vercel.
- `vercel.json` - konfigurasi ringan Vercel.

## Cara pakai

1. Upload workbook ke Google Sheets.
2. Buka Extensions > Apps Script.
3. Tempel isi `google-apps-script.gs`.
4. Ganti `TOKEN` dengan token internal.
5. Deploy Apps Script sebagai Web App.
6. Di Vercel, set Root Directory ke folder ini: `vercel-dashboard`.
7. Tambahkan Environment Variable:

   `SHEET_API_URL=https://script.google.com/macros/s/.../exec?token=...`

8. Deploy.

Dashboard akan mencoba mengambil data dari `/api/data` setiap halaman dibuka dan refresh otomatis setiap 60 detik. Jika environment variable belum diisi, dashboard tetap tampil memakai snapshot lokal 101 entri sebagai fallback.