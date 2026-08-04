"use server";

import { revalidatePath } from "next/cache";

/**
 * Paksa halaman mengambil data terbaru dari sumber.
 *
 * Dipakai tombol "Refresh data". Tanpa ini, staf harus menunggu jendela ISR
 * 5 menit berlalu setelah mengedit sheet.
 */
export async function refreshData() {
  revalidatePath("/");
}
