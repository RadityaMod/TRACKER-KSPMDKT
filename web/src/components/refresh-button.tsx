"use client";

import { useTransition } from "react";
import { refreshData } from "@/app/actions";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => refreshData())}
      className="min-h-11 border-0 bg-regal-blue px-3 text-[11px] font-extrabold tracking-wide text-white transition hover:bg-endless-sky disabled:cursor-wait disabled:bg-ink-muted sm:px-4"
    >
      {pending ? "Memuat…" : "Refresh data"}
      <span aria-live="polite" className="sr-only">
        {pending ? "Sedang memuat ulang data" : ""}
      </span>
    </button>
  );
}
