import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KSP Mendekat Tracker",
  description: "Pelacakan laporan dan aspirasi masyarakat KSP Mendekat.",
  // Data ini memuat kontak pelapor — jangan sampai terindeks.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
