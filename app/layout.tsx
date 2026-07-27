import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KSP Mendekat — Simulasi Kendali Laporan",
  description: "Simulasi ringan untuk pencatatan, penanganan, dan analitik laporan KSP Mendekat.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
