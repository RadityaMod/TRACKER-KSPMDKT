"use client";

import { RotateCw } from "lucide-react";
import { useTransition } from "react";
import { refreshData } from "@/app/actions";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => refreshData())}
      className="inline-flex min-h-11 items-center gap-2 px-3 text-xs font-bold text-regal-blue transition hover:bg-surface-sunken disabled:cursor-wait disabled:text-ink-muted sm:px-4"
    >
      {/*
        Ikon berputar hanya saat pending. Rotasi memakai transform, bukan
        properti layout, dan sudah otomatis mati lewat prefers-reduced-motion
        di globals.css.
      */}
      <RotateCw
        aria-hidden="true"
        className={`size-4 shrink-0 ${pending ? "animate-spin" : ""}`}
      />
      {pending ? "Memuat…" : "Refresh"}
      <span aria-live="polite" className="sr-only">
        {pending ? "Sedang memuat ulang data" : ""}
      </span>
    </button>
  );
}
