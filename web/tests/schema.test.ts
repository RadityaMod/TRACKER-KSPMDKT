import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/data/csv";
import { parseReports, SchemaError } from "@/lib/data/schema";

// Harus sama persis dengan header sheet sungguhan — termasuk "No. Telepon",
// bukan "No. Telpon".
const HEADER =
  "No;Tanggal Masuk;Kanal;Nama Pelapor;Kontak WA / ID Chat;No. Telepon;Alamat;" +
  "Status Pelapor;Kategori Aduan;Ringkasan Aspirasi;Lampiran;" +
  "Status Tindak Lanjut;Tanggal Update Terakhir;Catatan";

function csv(...rows: string[]) {
  return parseCsv([HEADER, ...rows].join("\n"));
}

describe("parseCsv", () => {
  it("memisahkan dengan titik-koma", () => {
    const rows = parseCsv("a;b;c\n1;2;3");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("menghormati titik-koma di dalam field ber-quote", () => {
    const rows = parseCsv('a;b\n"kiri; kanan";2');
    expect(rows[1]).toEqual(["kiri; kanan", "2"]);
  });

  it("mengubah quote ganda jadi satu tanda kutip", () => {
    // Baris 4 dataset nyata memuat """."""
    const rows = parseCsv('a\n"""."""');
    expect(rows[1]).toEqual(['"."']);
  });

  it("membuang baris yang seluruhnya kosong", () => {
    const rows = parseCsv("a;b\n1;2\n;\n3;4");
    expect(rows).toHaveLength(3);
  });
});

describe("parseReports", () => {
  it("memetakan kolom ke field bertipe", () => {
    const { reports } = parseReports(
      csv(
        "1;23/05/2026;WhatsApp;Budi;wa-id;628123;Jakarta;Kontak Baru;" +
          "Pendidikan;Ringkasan di sini;Tersedia;Baru;09/07/2026;Catatan bebas",
      ),
    );

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      no: 1,
      tanggalMasuk: "2026-05-23",
      kanal: "WhatsApp",
      namaPelapor: "Budi",
      noTelpon: "628123",
      kategori: "Pendidikan",
      status: "Baru",
      tanggalUpdate: "2026-07-09",
      perluVerifikasi: false,
    });
  });

  it("melempar SchemaError yang menyebut kolom hilang", () => {
    const rows = parseCsv("No;Tanggal Masuk\n1;23/05/2026");
    expect(() => parseReports(rows)).toThrow(SchemaError);

    try {
      parseReports(rows);
    } catch (error) {
      expect((error as SchemaError).missing).toContain("Nama Pelapor");
      expect((error as SchemaError).missing).toContain("Status Tindak Lanjut");
    }
  });

  it("melewati baris rusak alih-alih menjatuhkan seluruh dataset", () => {
    const { reports, skipped } = parseReports(
      csv(
        "1;23/05/2026;WhatsApp;Budi;;;;;;Pendidikan;;Baru;;",
        "bukan-angka;23/05/2026;OCA;Siti;;;;;;Hukum;;Baru;;",
        "3;24/05/2026;OCA;Andi;;;;;;Hukum;;Baru;;",
      ),
    );

    expect(reports.map((r) => r.no)).toEqual([1, 3]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].line).toBe(3);
  });

  it("tanggal invalid jadi null tanpa membuang barisnya", () => {
    const { reports } = parseReports(
      csv("1;31/02/2026;OCA;Budi;;;;;;Pendidikan;;Baru;;"),
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].tanggalMasuk).toBeNull();
  });

  it("menandai entri yang catatannya minta verifikasi", () => {
    const { reports } = parseReports(
      csv(
        "1;23/05/2026;OCA;A;;;;;;X;;Baru;;PERLU VERIFIKASI NOMOR: duplikat",
        "2;23/05/2026;OCA;B;;;;;;X;;Baru;;Kemungkinan DUPLIKAT dari baris lain",
        "3;23/05/2026;OCA;C;;;;;;X;;Baru;;Catatan biasa",
      ),
    );
    expect(reports.map((r) => r.perluVerifikasi)).toEqual([true, true, false]);
  });

  it("menerima kedua ejaan kolom telepon", () => {
    // Google Sheet memakai "No. Telpon", snapshot CSV lokal "No. Telepon".
    // Keduanya harus terisi, bukan salah satu jadi kosong diam-diam.
    for (const spelling of ["No. Telpon", "No. Telepon", "Nomor Telepon"]) {
      const rows = parseCsv(
        `No;Tanggal Masuk;Nama Pelapor;Kategori Aduan;Status Tindak Lanjut;${spelling}\n` +
          `1;23/05/2026;Budi;Hukum;Baru;628123456789`,
      );
      const { reports, unmappedColumns } = parseReports(rows);
      expect(reports[0].noTelpon, spelling).toBe("628123456789");
      expect(unmappedColumns, spelling).not.toContain("No. Telpon");
    }
  });

  it("melaporkan kolom telepon sebagai tidak terpetakan bila tak satu pun alias cocok", () => {
    const rows = parseCsv(
      "No;Tanggal Masuk;Nama Pelapor;Kategori Aduan;Status Tindak Lanjut;HP\n" +
        "1;23/05/2026;Budi;Hukum;Baru;628123456789",
    );
    const { reports, unmappedColumns } = parseReports(rows);
    expect(reports[0].noTelpon).toBe("");
    expect(unmappedColumns).toContain("No. Telpon");
  });

  it("tidak terpengaruh urutan kolom", () => {
    const rows = parseCsv(
      "Catatan;Status Tindak Lanjut;Kategori Aduan;Nama Pelapor;Tanggal Masuk;No\n" +
        "catatan;Selesai;Hukum;Budi;23/05/2026;7",
    );
    const { reports } = parseReports(rows);
    expect(reports[0]).toMatchObject({ no: 7, namaPelapor: "Budi", status: "Selesai" });
  });
});
