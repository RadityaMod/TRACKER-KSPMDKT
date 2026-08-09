import Image from "next/image";

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
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12">
      <section className="w-full max-w-md text-center">
        <Image
          src="/logo-kantor-staf-presiden.png"
          alt="Logo Kantor Staf Presiden"
          width={2560}
          height={1810}
          priority
          className="mx-auto h-auto w-52 sm:w-60"
        />

        <h1 className="mt-3 text-4xl leading-none font-black tracking-tight text-regal-blue sm:text-5xl">
          KSP MENDEKAT
        </h1>
        <p className="mt-2 text-[11px] font-medium tracking-[0.12em] text-ink uppercase sm:text-xs">
          Mendengar lebih cepat, merajut lebih tepat
        </p>

        <form
          action="/api/pin/unlock"
          method="post"
          className="mx-auto mt-12 w-full max-w-xs"
        >
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/*
            Input PIN tampil sebagai garis, bukan kotak — mengikuti garis
            pemisah pada logo resmi.
          */}
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
              className={`h-11 w-full border-0 border-b bg-transparent text-center text-2xl font-black tracking-[0.5em] text-regal-blue outline-none transition placeholder:font-normal placeholder:tracking-[0.4em] placeholder:text-slient-grey focus:border-smothe-blue ${
                message ? "border-b-red-400" : "border-b-ink-soft"
              }`}
            />
          </label>

          {/*
            Tanpa tombol kirim: satu-satunya isian yang terlihat adalah PIN,
            jadi Enter memicu implicit submission milik form HTML.
          */}
          <p
            aria-live="polite"
            className={`mt-3 min-h-5 text-xs font-semibold ${
              message ? "text-red-700" : "text-ink-muted"
            }`}
          >
            {message ?? "Tekan Enter untuk membuka dashboard"}
          </p>
        </form>

        <p className="mt-10 text-[11px] leading-5 text-ink-muted">
          Akses terbatas untuk tim internal. Jangan bagikan PIN di chat publik.
        </p>
      </section>
    </main>
  );
}
