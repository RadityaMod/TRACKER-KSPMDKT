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
      className="shrink-0 rounded-lg border border-slient-grey px-3 py-1.5 text-xs font-bold text-regal-blue hover:bg-white-sand disabled:opacity-60"
    >
      {pending ? "Memuat…" : "Refresh data"}
      <span aria-live="polite" className="sr-only">
        {pending ? "Sedang memuat ulang data" : ""}
      </span>
    </button>
  );
}
