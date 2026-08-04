import { describe, expect, it } from "vitest";
import { FallbackSource, type RawData, type ReportSource } from "@/lib/data/source";

function ok(label: string): ReportSource {
  return { read: async (): Promise<RawData> => ({ rows: [["a"], ["1"]], label }) };
}

function fails(message: string): ReportSource {
  return {
    read: async (): Promise<RawData> => {
      throw new Error(message);
    },
  };
}

describe("FallbackSource", () => {
  it("memakai sumber utama dan TIDAK menandai fallback saat berhasil", async () => {
    const data = await new FallbackSource(ok("Google Sheets"), ok("lokal")).read();

    expect(data.label).toBe("Google Sheets");
    expect(data.fallbackReason).toBeUndefined();
  });

  it("beralih ke fallback dan melaporkan alasannya saat utama gagal", async () => {
    // Yang penting di sini: alasannya IKUT TERBAWA. Tanpa itu, dashboard
    // menyajikan snapshot beku tanpa ada yang menyadari.
    const data = await new FallbackSource(
      fails("Akses ditolak (403)"),
      ok("CSV lokal"),
    ).read();

    expect(data.label).toBe("CSV lokal");
    expect(data.fallbackReason).toContain("403");
  });

  it("membiarkan error naik bila fallback ikut gagal", async () => {
    await expect(
      new FallbackSource(fails("sheets mati"), fails("file hilang")).read(),
    ).rejects.toThrow("file hilang");
  });
});
