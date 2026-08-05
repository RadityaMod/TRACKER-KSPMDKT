type PinPageProps = {
  searchParams?: Promise<{
    error?: string;
    redirectTo?: string;
  }>;
};

function errorMessage(code?: string): string | undefined {
  if (code === "invalid") return "PIN belum cocok. Coba masukkan ulang.";
  if (code === "missing") return "Masukkan PIN terlebih dahulu.";
  if (code === "config") return "PIN dashboard belum dikonfigurasi di Vercel.";
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
    <main className="flex min-h-screen items-center justify-center bg-white-sand px-4 py-8">
      <section className="w-full max-w-sm rounded-2xl border border-slient-grey bg-white p-5 shadow-[0_18px_50px_rgba(3,53,94,0.12)]">
        <div className="mb-5">
          <p className="text-[11px] font-bold tracking-[0.22em] text-regal-blue uppercase">
            Akses terbatas
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-ink">
            KSP Mendekat Tracker
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Masukkan PIN untuk membuka dashboard. Satu PIN bisa dipakai di banyak perangkat yang berizin.
          </p>
        </div>

        {message && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {message}
          </p>
        )}

        <form action="/api/pin/unlock" method="post" className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label className="block">
            <span className="mb-1 block text-xs font-bold tracking-wide text-ink-muted uppercase">
              PIN Dashboard
            </span>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              autoFocus
              required
              className="h-13 w-full rounded-xl border border-slient-grey bg-white px-4 text-xl font-black tracking-[0.35em] text-regal-blue outline-none transition focus:border-smothe-blue focus:ring-4 focus:ring-royal-light-blue/35"
              aria-label="PIN dashboard"
            />
          </label>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-regal-blue text-sm font-black tracking-wide text-white transition hover:bg-endless-sky focus-visible:outline-smothe-blue"
          >
            Buka Dashboard
          </button>
        </form>

        <p className="mt-5 border-t border-slient-grey pt-4 text-[11px] leading-5 text-ink-muted">
          Jangan bagikan PIN di chat publik. Ganti PIN berkala bila perangkat/tim berubah.
        </p>
      </section>
    </main>
  );
}