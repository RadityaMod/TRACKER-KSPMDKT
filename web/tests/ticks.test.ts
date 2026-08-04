import { describe, expect, it } from "vitest";
import { tickIndices } from "@/components/traffic-chart";

describe("tickIndices", () => {
  it("selalu menyertakan titik pertama dan terakhir", () => {
    const ticks = tickIndices(70, 7);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)).toBe(69);
  });

  it("memberi jarak yang kurang lebih sama", () => {
    const ticks = tickIndices(61, 7);
    expect(ticks).toEqual([0, 10, 20, 30, 40, 50, 60]);
  });

  it("tidak pernah melebihi jumlah label yang diminta", () => {
    expect(tickIndices(100, 5)).toHaveLength(5);
  });

  it("tidak menghasilkan indeks duplikat saat data lebih sedikit dari label", () => {
    const ticks = tickIndices(3, 7);
    expect(ticks).toEqual([...new Set(ticks)]);
    expect(ticks).toEqual([0, 1, 2]);
  });

  it("menangani satu titik", () => {
    expect(tickIndices(1, 7)).toEqual([0]);
  });

  it("menangani dua titik", () => {
    expect(tickIndices(2, 7)).toEqual([0, 1]);
  });

  it("menangani data kosong", () => {
    expect(tickIndices(0, 7)).toEqual([]);
  });

  it("indeks selalu berada dalam rentang yang sah", () => {
    for (const total of [1, 2, 5, 17, 64, 103]) {
      for (const tick of tickIndices(total, 7)) {
        expect(tick).toBeGreaterThanOrEqual(0);
        expect(tick).toBeLessThan(total);
      }
    }
  });
});
