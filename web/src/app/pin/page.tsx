import Image from "next/image";
import { ArrowRight } from "lucide-react";

type PinPageProps = {
  searchParams?: Promise<{
    error?: string;
    redirectTo?: string;
  }>;
};

function errorMessage(code?: string): string | undefined {
  if (code === "invalid") return "PIN belum cocok. Coba masukkan ulang.";
  if (code === "missing") return "Masukkan PIN terlebih dahulu.";
  if (code === "config") {
    return "PIN atau secret dashboard belum dikonfigurasi di Vercel.";
  }
  if (code === "rate_limit") {
    return "Terlalu banyak percobaan. Tunggu 15 menit, lalu coba kembali.";
  }
  return undefined;
}

function safeRedirect(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function PinPage({ searchParams }: PinPageProps) {
  const params = (await searchParams) ?? {};
  const message = errorMessage(params.error);
  const redirectTo = safeRedirect(params.redirectTo);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <section className="motion-lock-screen w-full max-w-md text-center">
        {/*
          Berkas logo sudah dipangkas sampai batas gambar, jadi jarak ke
          wordmark murni ditentukan margin di bawah ini.
        */}
        <Image
          src="/logo-kantor-staf-presiden.png"
          alt="Logo Kantor Staf Presiden"
          width={2443}
          height={1221}
          priority
          className="motion-lock-logo mx-auto h-auto w-52 sm:w-60"
        />

        {/*
          Margin kecil saja: baris judul masih menyumbang leading sendiri di
          atas huruf, jadi jarak optisnya kira-kira 11px, bukan 4px.
        */}
        <h1 className="motion-lock-title mt-1 text-4xl leading-none font-black tracking-tight text-regal-blue sm:text-5xl">
          KSP MENDEKAT
        </h1>
        <p className="motion-lock-tagline mt-2 text-[11px] font-medium tracking-[0.12em] text-ink uppercase sm:text-xs">
          Mendengar lebih cepat, merajut lebih tepat
        </p>

        <form
          action="/api/pin/unlock"
          method="post"
          className="motion-lock-form mx-auto mt-12 w-full max-w-xs"
        >
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/*
            Input PIN tampil sebagai garis, bukan kotak — mengikuti garis
            pemisah pada logo resmi.
          */}
          <div className="relative">
            <label className="block">
              <span className="sr-only">PIN dashboard</span>
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                required
                placeholder="••••••"
                aria-invalid={message ? true : undefined}
                className={`h-11 w-full border-0 border-b bg-transparent px-12 text-center text-2xl font-black tracking-[0.5em] text-regal-blue outline-none transition placeholder:font-normal placeholder:tracking-[0.4em] placeholder:text-line focus:border-smothe-blue sm:px-0 ${
                  message ? "border-b-red-400" : "border-b-ink-soft"
                }`}
              />
            </label>
            <button
              type="submit"
              aria-label="Buka dashboard"
              className="absolute top-0 right-0 flex size-11 items-center justify-center text-regal-blue transition-colors hover:text-endless-sky focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-endless-sky active:text-endless-sky sm:hidden"
            >
              <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </button>
          </div>

          {message && (
            <p aria-live="polite" className="mt-3 text-xs font-semibold text-red-700">
              {message}
            </p>
          )}
        </form>

        <p className="motion-lock-notice mt-10 text-[11px] leading-5 text-red-700">
          Akses terbatas untuk tim internal. Jangan bagikan akses.
        </p>
      </section>
    </main>
  );
}
