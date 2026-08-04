import { describe, expect, it } from "vitest";
import {
  parseDateId,
  toDateOnly,
  toDate,
  addDays,
  dateRange,
  formatShort,
} from "@/lib/data/date";

describe("parseDateId", () => {
  it("memperlakukan input sebagai DD/MM/YYYY, bukan MM/DD", () => {
    // Ini inti masalahnya: new Date('03/06/2026') memberi 6 Maret.
    expect(parseDateId("03/06/2026")).toBe("2026-06-03");
    expect(parseDateId("06/03/2026")).toBe("2026-03-06");
  });

  it("tidak setuju dengan new Date() untuk tanggal ambigu", () => {
    const ours = parseDateId("03/06/2026");
    const naive = toDateOnly(new Date("03/06/2026"));
    expect(ours).not.toBe(naive);
  });

  it("menerima hari/bulan satu digit", () => {
    expect(parseDateId("3/6/2026")).toBe("2026-06-03");
  });

  it("menerima tanggal nyata dari dataset", () => {
    expect(parseDateId("23/05/2026")).toBe("2026-05-23");
    expect(parseDateId("26/07/2026")).toBe("2026-07-26");
  });

  it("menolak tanggal yang tidak ada", () => {
    expect(parseDateId("31/02/2026")).toBeNull();
    expect(parseDateId("32/01/2026")).toBeNull();
    expect(parseDateId("01/13/2026")).toBeNull();
  });

  it("menerima 29 Februari di tahun kabisat saja", () => {
    expect(parseDateId("29/02/2024")).toBe("2024-02-29");
    expect(parseDateId("29/02/2026")).toBeNull();
  });

  it("mengembalikan null untuk input kosong atau salah format", () => {
    expect(parseDateId("")).toBeNull();
    expect(parseDateId(null)).toBeNull();
    expect(parseDateId(undefined)).toBeNull();
    expect(parseDateId("2026-06-03")).toBeNull();
    expect(parseDateId("kemarin")).toBeNull();
  });
});

describe("aritmatika tanggal", () => {
  it("addDays melewati batas bulan", () => {
    expect(addDays("2026-05-31", 1)).toBe("2026-06-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("dateRange inklusif di kedua ujung", () => {
    expect(dateRange("2026-06-01", "2026-06-04")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
    ]);
  });

  it("dateRange satu hari menghasilkan satu titik", () => {
    expect(dateRange("2026-06-01", "2026-06-01")).toEqual(["2026-06-01"]);
  });

  it("toDate memakai UTC sehingga tidak bergeser zona waktu", () => {
    expect(toDate("2026-06-03").getUTCDate()).toBe(3);
    expect(toDate("2026-06-03").getUTCMonth()).toBe(5);
  });

  it("formatShort memakai nama bulan Indonesia", () => {
    expect(formatShort("2026-05-23")).toBe("23 Mei");
    expect(formatShort("2026-08-01")).toBe("01 Agu");
  });
});
