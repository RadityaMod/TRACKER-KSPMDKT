import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "@/lib/data/csv";
import { parseReports } from "@/lib/data/schema";
import { computeInsights, computeMetrics, isNew, isResolved } from "@/lib/data/metrics";
import { computeTraffic } from "@/lib/data/traffic";
import {
  applyQuery,
  EMPTY_QUERY,
  nextSort,
  paginate,
  REPORTS_PER_PAGE,
  uniqueStatuses,
  type Query,
} from "@/lib/data/filter";
import type { Report } from "@/lib/data/schema";

/**
 * Snapshot data sungguhan.
 *
 * File ini memuat PII pelapor, jadi sengaja masuk .gitignore dan TIDAK ada di
 * clone yang bersih. Test di bawah karena itu di-skip kalau filenya tidak ada,
 * bukan gagal — cakupan sintetis di schema.test.ts / filter / traffic tetap
 * jalan di mana pun. Di mesin yang punya snapshot-nya, test ini berjalan
 * sebagai pengaman regresi terhadap bentuk data nyata.
 */
const REAL_CSV = path.join(process.cwd(), "data", "laporan.csv");
const HAS_REAL_DATA = existsSync(REAL_CSV);

function loadRaw() {
  if (!HAS_REAL_DATA) {
    return { reports: [] as Report[], skipped: [], unmappedColumns: [] };
  }
  return parseReports(parseCsv(readFileSync(REAL_CSV, "utf8")));
}

function loadRealData(): Report[] {
  return loadRaw().reports;
}

function make(overrides: Partial<Report>): Report {
  return {
    no: 1,
    tanggalMasuk: "2026-06-01",
    kanal: "OCA",
    namaPelapor: "Nama",
    kontakWa: "",
    noTelpon: "",
    alamat: "",
    statusPelapor: "",
    kategori: "Umum",
    ringkasan: "",
    lampiran: "",
    status: "Baru",
    tanggalUpdate: null,
    catatan: "",
    perluVerifikasi: false,
    ...overrides,
  };
}

describe.skipIf(!HAS_REAL_DATA)("dataset nyata", () => {
  const reports = loadRealData();

  it("memuat seluruh 103 entri tanpa ada yang dilewati", () => {
    expect(reports).toHaveLength(103);
  });

  it("setiap baris punya tanggal masuk yang bisa diparse", () => {
    expect(reports.filter((r) => !r.tanggalMasuk)).toHaveLength(0);
  });

  it("nomor urut berjalan 1..103", () => {
    expect(reports[0].no).toBe(1);
    expect(reports.at(-1)!.no).toBe(103);
  });

  it("mem-parse quote bersarang di baris 4", () => {
    expect(reports.find((r) => r.no === 4)!.kontakWa).toBe('"."');
  });

  it("setiap nama kolom yang dipetakan benar-benar ada di sumber", () => {
    // Penjaga terhadap salah ketik nama kolom. Pemetaan sempat tertulis
    // "No. Telpon" padahal sheet memakai "No. Telepon", dan SELURUH nomor
    // telepon hilang diam-diam tanpa ada test yang gagal.
    expect(loadRaw().unmappedColumns).toEqual([]);
  });

  it("mengisi nomor telepon dari kolom yang benar", () => {
    // Sengaja memeriksa BENTUKNYA, bukan nomor persisnya: file ini ter-commit
    // ke repo, dan menuliskan nomor pelapor sungguhan di sini sama saja
    // dengan membocorkannya lewat jalur lain. Cek bentuk sudah cukup untuk
    // membuktikan kolomnya terpetakan benar.
    expect(reports.find((r) => r.no === 1)!.noTelpon).toMatch(/^62\d{8,}$/);
    expect(reports.filter((r) => r.noTelpon === "")).toHaveLength(0);
  });

  it("menandai 11 entri yang catatannya minta verifikasi", () => {
    const flagged = reports.filter((r) => r.perluVerifikasi).map((r) => r.no);
    expect(flagged).toEqual([4, 5, 9, 10, 20, 22, 23, 25, 26, 40, 63]);
  });

  it("tidak menandai entri yang kata 'duplikat'-nya ada di ringkasan", () => {
    // Entri 43 menyebut "duplikat bisa diterbitkan" soal pemalsuan BPKB —
    // itu isi laporan, bukan penanda kualitas data. Pengecekan sengaja
    // dibatasi ke kolom Catatan supaya kasus seperti ini tidak ikut tertandai.
    const row43 = reports.find((r) => r.no === 43)!;
    expect(row43.ringkasan.toLowerCase()).toContain("duplikat");
    expect(row43.perluVerifikasi).toBe(false);
  });
});

describe("computeMetrics", () => {
  it("membagi status jadi baru / proses / selesai", () => {
    const metrics = computeMetrics([
      make({ status: "Baru" }),
      make({ status: "Baru" }),
      make({ status: "Diproses" }),
      make({ status: "Selesai" }),
      make({ status: "Ditutup" }),
    ]);
    expect(metrics).toEqual({ total: 5, baru: 2, proses: 1, selesai: 2 });
  });

  it.skipIf(!HAS_REAL_DATA)("total selalu sama dengan jumlah ketiga bucket", () => {
    const reports = loadRealData();
    const m = computeMetrics(reports);
    expect(m.baru + m.proses + m.selesai).toBe(m.total);
  });

  it("mengenali status tanpa peduli huruf besar-kecil", () => {
    expect(isNew("  BARU ")).toBe(true);
    expect(isResolved("Selesai Ditangani")).toBe(true);
    expect(isResolved("Diproses")).toBe(false);
  });
});

describe("computeTraffic", () => {
  it("TIDAK memperpanjang rentang melewati entri terakhir", () => {
    // Bug dashboard lama: sumbu ditarik sampai hari ini sehingga garis
    // terjun ke nol berhari-hari setelah laporan terakhir.
    const traffic = computeTraffic([
      make({ tanggalMasuk: "2026-05-01" }),
      make({ tanggalMasuk: "2026-05-03" }),
    ]);
    expect(traffic.points.at(-1)!.date).toBe("2026-05-03");
  });

  it("memulai grafik pada 1 Mei dan mengabaikan laporan sebelumnya", () => {
    const traffic = computeTraffic([
      make({ tanggalMasuk: "2026-04-30" }),
      make({ tanggalMasuk: "2026-05-03" }),
    ]);

    expect(traffic.points[0]).toEqual({ date: "2026-05-01", count: 0 });
    expect(traffic.points.at(-1)).toEqual({ date: "2026-05-03", count: 1 });
    expect(traffic.total).toBe(1);
  });

  it("tetap menggambar nol untuk hari kosong di tengah", () => {
    const traffic = computeTraffic([
      make({ tanggalMasuk: "2026-05-01" }),
      make({ tanggalMasuk: "2026-05-03" }),
    ]);
    expect(traffic.points.map((p) => p.count)).toEqual([1, 0, 1]);
  });

  it("menjumlahkan beberapa laporan di hari yang sama", () => {
    const traffic = computeTraffic([
      make({ tanggalMasuk: "2026-05-01" }),
      make({ tanggalMasuk: "2026-05-01" }),
      make({ tanggalMasuk: "2026-05-01" }),
    ]);
    expect(traffic.points).toEqual([{ date: "2026-05-01", count: 3 }]);
    expect(traffic.peak).toEqual({ date: "2026-05-01", count: 3 });
  });

  it("mengabaikan entri tanpa tanggal", () => {
    const traffic = computeTraffic([
      make({ tanggalMasuk: null }),
      make({ tanggalMasuk: "2026-05-01" }),
    ]);
    expect(traffic.total).toBe(1);
  });

  it("menangani dataset kosong tanpa crash", () => {
    expect(computeTraffic([])).toEqual({ points: [], peak: null, total: 0 });
  });
});

describe.skipIf(!HAS_REAL_DATA)("applyQuery (data nyata)", () => {
  const reports = loadRealData();

  it("mengembalikan semua entri untuk query kosong", () => {
    expect(applyQuery(reports, EMPTY_QUERY)).toHaveLength(103);
  });

  it("mencari lintas kolom tanpa peduli huruf besar-kecil", () => {
    const upper = applyQuery(reports, { ...EMPTY_QUERY, search: "SPMB" });
    const lower = applyQuery(reports, { ...EMPTY_QUERY, search: "spmb" });
    expect(upper.length).toBe(lower.length);
    expect(upper.length).toBeGreaterThan(0);
  });

  it("memfilter berdasarkan status persis", () => {
    const filtered = applyQuery(reports, { ...EMPTY_QUERY, status: "Baru" });
    expect(filtered).toHaveLength(103);
    expect(applyQuery(reports, { ...EMPTY_QUERY, status: "Selesai" })).toHaveLength(0);
  });

  it("sortir naik dan turun saling membalik", () => {
    const asc = applyQuery(reports, {
      ...EMPTY_QUERY,
      sortKey: "kategori",
      sortDirection: "asc",
    });
    const desc = applyQuery(reports, {
      ...EMPTY_QUERY,
      sortKey: "kategori",
      sortDirection: "desc",
    });
    expect(asc[0].kategori <= asc.at(-1)!.kategori).toBe(true);
    expect(desc[0].kategori).not.toBe(asc[0].kategori);
  });

  it("menggabungkan cari dan filter status", () => {
    const combined = applyQuery(reports, {
      ...EMPTY_QUERY,
      search: "SPMB",
      status: "Selesai",
    });
    expect(combined).toHaveLength(0);
  });
});

describe("applyQuery (sintetis)", () => {
  // Sengaja di luar blok yang butuh snapshot nyata supaya tetap jalan di
  // clone bersih, karena datanya dibuat sendiri.
  it("menaruh nilai kosong di bawah pada kedua arah", () => {
    const data = [
      make({ no: 1, kategori: "Zebra" }),
      make({ no: 2, kategori: "" }),
      make({ no: 3, kategori: "Alpha" }),
    ];
    const asc = applyQuery(data, { ...EMPTY_QUERY, sortKey: "kategori", sortDirection: "asc" });
    const desc = applyQuery(data, { ...EMPTY_QUERY, sortKey: "kategori", sortDirection: "desc" });
    expect(asc.at(-1)!.no).toBe(2);
    expect(desc.at(-1)!.no).toBe(2);
  });

  it("memfilter berdasarkan status persis", () => {
    const data = [make({ no: 1, status: "Baru" }), make({ no: 2, status: "Selesai" })];
    expect(applyQuery(data, { ...EMPTY_QUERY, status: "Selesai" }).map((r) => r.no)).toEqual([2]);
  });

  it("mencari tanpa peduli huruf besar-kecil", () => {
    const data = [make({ no: 1, kategori: "Pendidikan SPMB" }), make({ no: 2, kategori: "Hukum" })];
    expect(applyQuery(data, { ...EMPTY_QUERY, search: "spmb" }).map((r) => r.no)).toEqual([1]);
    expect(applyQuery(data, { ...EMPTY_QUERY, search: "SPMB" }).map((r) => r.no)).toEqual([1]);
  });
});

describe("nextSort", () => {
  it("berputar asc → desc → mati", () => {
    let state = nextSort({ sortKey: null, sortDirection: null }, "status");
    expect(state).toEqual({ sortKey: "status", sortDirection: "asc" });
    state = nextSort(state, "status");
    expect(state).toEqual({ sortKey: "status", sortDirection: "desc" });
    state = nextSort(state, "status");
    expect(state).toEqual({ sortKey: null, sortDirection: null });
  });

  it("ganti kolom selalu mulai dari asc", () => {
    const state = nextSort({ sortKey: "status", sortDirection: "desc" }, "kanal");
    expect(state).toEqual({ sortKey: "kanal", sortDirection: "asc" });
  });

  it("hasilnya bisa di-spread ke Query dan benar-benar mengubah sortir", () => {
    // Ini yang sebelumnya bocor: nextSort mengembalikan {key,direction}
    // sementara Query memakai {sortKey,sortDirection}, jadi spread-nya tidak
    // berefek apa pun dan sortir diam-diam mati.
    const data = [
      make({ no: 1, kategori: "Zebra" }),
      make({ no: 2, kategori: "Alpha" }),
    ];
    const query: Query = { ...EMPTY_QUERY, ...nextSort(EMPTY_QUERY, "kategori") };

    expect(query.sortKey).toBe("kategori");
    expect(query.sortDirection).toBe("asc");
    expect(applyQuery(data, query).map((r) => r.no)).toEqual([2, 1]);
  });
});

describe("paginate", () => {
  const data = Array.from({ length: 45 }, (_, index) => index + 1);

  it("membatasi setiap halaman ke 20 entri", () => {
    expect(REPORTS_PER_PAGE).toBe(20);
    expect(paginate(data, 1).items).toEqual(data.slice(0, 20));
    expect(paginate(data, 2).items).toEqual(data.slice(20, 40));
    expect(paginate(data, 3).items).toEqual(data.slice(40, 45));
  });

  it("menjaga nomor halaman tetap dalam rentang", () => {
    expect(paginate(data, 99).page).toBe(3);
    expect(paginate(data, 0).page).toBe(1);
    expect(paginate([], 2)).toMatchObject({
      items: [],
      page: 1,
      pageCount: 1,
      first: 0,
      last: 0,
    });
  });
});

describe.skipIf(!HAS_REAL_DATA)("uniqueStatuses", () => {
  it("mengembalikan nilai unik terurut", () => {
    expect(uniqueStatuses(loadRealData())).toEqual(["Baru"]);
  });
});

describe("computeInsights", () => {
  it("menghitung sebaran kanal, terbanyak dulu", () => {
    const data = [
      make({ kanal: "OCA" }),
      make({ kanal: "OCA" }),
      make({ kanal: "WhatsApp" }),
    ];
    expect(computeInsights(data).kanal).toEqual([
      { label: "OCA", count: 2 },
      { label: "WhatsApp", count: 1 },
    ]);
  });

  it("mengabaikan kanal kosong alih-alih menghitungnya sebagai kategori", () => {
    const data = [make({ kanal: "OCA" }), make({ kanal: "" }), make({ kanal: "  " })];
    expect(computeInsights(data).kanal).toEqual([{ label: "OCA", count: 1 }]);
  });

  it("memilih kategori terbanyak", () => {
    const data = [
      make({ kategori: "Hukum" }),
      make({ kategori: "SPMB" }),
      make({ kategori: "SPMB" }),
    ];
    expect(computeInsights(data).kategoriTeratas).toEqual({ label: "SPMB", count: 2 });
  });

  it("menghitung entri yang perlu verifikasi", () => {
    const data = [
      make({ perluVerifikasi: true }),
      make({ perluVerifikasi: true }),
      make({ perluVerifikasi: false }),
    ];
    expect(computeInsights(data).perluVerifikasi).toBe(2);
  });

  it("ragamStatus membedakan data satu-status dari data beragam", () => {
    // Inilah yang menentukan apakah KPI status ditampilkan: selama hanya ada
    // satu status, tiga tile-nya akan permanen nol dan lebih baik diganti.
    expect(computeInsights([make({ status: "Baru" }), make({ status: "Baru" })]).ragamStatus).toBe(1);
    expect(
      computeInsights([make({ status: "Baru" }), make({ status: "Selesai" })]).ragamStatus,
    ).toBe(2);
  });

  it("aman untuk dataset kosong", () => {
    expect(computeInsights([])).toEqual({
      total: 0,
      kanal: [],
      kategoriTeratas: null,
      perluVerifikasi: 0,
      ragamStatus: 0,
    });
  });
});

describe("sortir tanggal", () => {
  const data = [
    make({ no: 1, tanggalMasuk: "2026-06-01", tanggalUpdate: "2026-07-14" }),
    make({ no: 2, tanggalMasuk: "2026-06-25", tanggalUpdate: "2026-06-25" }),
    make({ no: 3, tanggalMasuk: "2026-05-23", tanggalUpdate: "2026-08-01" }),
  ];

  it("default: tanggal masuk terbaru di atas", () => {
    // Default lama memakai urutan baris sheet, yang menaik menurut nomor
    // entri — laporan terlama justru nangkring di puncak.
    expect(applyQuery(data, EMPTY_QUERY).map((r) => r.no)).toEqual([2, 1, 3]);
  });

  it("sortir tanggal masuk, terlama dulu", () => {
    const q: Query = { ...EMPTY_QUERY, sortKey: "masuk", sortDirection: "asc" };
    expect(applyQuery(data, q).map((r) => r.no)).toEqual([3, 1, 2]);
  });

  it("sortir tanggal masuk, terbaru dulu", () => {
    const q: Query = { ...EMPTY_QUERY, sortKey: "masuk", sortDirection: "desc" };
    expect(applyQuery(data, q).map((r) => r.no)).toEqual([2, 1, 3]);
  });

  it("urut kronologis, bukan menurut teks DD/MM/YYYY", () => {
    // Kalau diurut sebagai teks tampilan, "01/12/2026" akan dianggap lebih
    // kecil dari "02/01/2026" karena harinya dibandingkan lebih dulu.
    const d = [
      make({ no: 1, tanggalMasuk: "2026-12-01" }),
      make({ no: 2, tanggalMasuk: "2026-01-02" }),
      make({ no: 3, tanggalMasuk: "2027-01-01" }),
    ];
    const q: Query = { ...EMPTY_QUERY, sortKey: "masuk", sortDirection: "asc" };
    expect(applyQuery(d, q).map((r) => r.no)).toEqual([2, 1, 3]);
  });

  it("sortir update tetap tersedia dan memakai tanggal masuk bila update kosong", () => {
    const d = [
      make({ no: 1, tanggalMasuk: "2026-07-20", tanggalUpdate: null }),
      make({ no: 2, tanggalMasuk: "2026-06-01", tanggalUpdate: "2026-06-05" }),
    ];
    const q: Query = { ...EMPTY_QUERY, sortKey: "update", sortDirection: "desc" };
    expect(applyQuery(d, q).map((r) => r.no)).toEqual([1, 2]);
  });

  it("tanggal kosong sama sekali tetap di bawah", () => {
    const d = [
      make({ no: 1, tanggalMasuk: null, tanggalUpdate: null }),
      make({ no: 2, tanggalMasuk: "2026-06-01", tanggalUpdate: "2026-06-01" }),
    ];
    expect(applyQuery(d, EMPTY_QUERY).map((r) => r.no)).toEqual([2, 1]);
  });

  it("nomor urut tampilan mengikuti hasil sortir, bukan nomor entri", () => {
    // Kolom No di tabel dihitung dari posisi baris, jadi selalu 1..N
    // walau nomor entri aslinya melompat-lompat setelah diurutkan.
    const urut = applyQuery(data, EMPTY_QUERY).map((_, i) => i + 1);
    expect(urut).toEqual([1, 2, 3]);
  });
});
