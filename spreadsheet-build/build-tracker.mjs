import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve("..");
const outputDir = path.join(root, "outputs", "ksp-mendekat");
const publicDataDir = path.join(root, "public", "data");
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(publicDataDir, { recursive: true });

const headers = ["ID Laporan","Tanggal Masuk","Nama Pelapor","Kontak","Lokasi Kegiatan","Isi Laporan","Kategori","Prioritas","Status","Penanggung Jawab","Tanggal Update","Target Internal","Catatan Penanganan"];
const records = [
  ["KSPM-2607-0184",new Date("2026-07-18T09:20:00Z"),"Rina Mulyani","08•• •••• 4217","KSP Mendekat - Bogor","Akses bantuan usaha mikro belum jelas. Pelapor membutuhkan kejelasan jalur bantuan untuk mengembangkan usaha olahan pangan rumahan.","Ekonomi rakyat","Tinggi","Dalam penanganan","Maya Putri",new Date("2026-07-26T14:10:00Z"),new Date("2026-07-29T00:00:00Z"),"Persyaratan awal telah dikirim kepada pelapor."],
  ["KSPM-2607-0181",new Date("2026-07-15T11:45:00Z"),"Dedi Suhendar","d•••@mail.id","KSP Mendekat - Tangerang","Kendala verifikasi bantuan perumahan. Dokumen telah diserahkan tetapi status verifikasi tidak berubah selama lebih dari tiga minggu.","Perumahan","Mendesak","Ditugaskan","Rafi Pratama",new Date("2026-07-24T08:35:00Z"),new Date("2026-07-25T00:00:00Z"),"Laporan lengkap dan penanggung jawab telah ditetapkan."],
  ["KSPM-2607-0179",new Date("2026-07-13T13:05:00Z"),"Siti Marhamah","08•• •••• 1092","KSP Mendekat - Depok","Rujukan layanan kesehatan ibu. Pelapor meminta bantuan prosedur rujukan lanjutan untuk pemeriksaan kehamilan berisiko.","Kesehatan","Tinggi","Menunggu pelapor","Nina Larasati",new Date("2026-07-25T10:50:00Z"),new Date("2026-07-28T00:00:00Z"),"Menunggu foto surat rujukan terakhir dari pelapor."],
  ["KSPM-2607-0173",new Date("2026-07-09T08:40:00Z"),"Ahmad Fahrudin","08•• •••• 8334","KSP Mendekat - Bekasi","Perbaikan data penerima bantuan pendidikan. Nama anak tercatat berbeda pada dua dokumen sehingga proses bantuan tertahan.","Pendidikan","Normal","Dalam penanganan","Bagas Wicaksono",new Date("2026-07-20T16:30:00Z"),new Date("2026-07-26T00:00:00Z"),"Koreksi data telah diajukan ke unit layanan."],
  ["KSPM-2607-0168",new Date("2026-07-06T10:10:00Z"),"Lina Handayani","l•••@mail.id","KSP Mendekat - Cianjur","Informasi sertifikasi tanah keluarga. Pelapor memerlukan tahapan dan dokumen awal untuk proses sertifikasi.","Pertanahan","Normal","Selesai ditangani","Maya Putri",new Date("2026-07-23T15:20:00Z"),null,"Panduan dan titik layanan telah diberikan."],
  ["KSPM-2607-0161",new Date("2026-07-02T14:30:00Z"),"Bambang Riyadi","08•• •••• 5610","KSP Mendekat - Karawang","Keluhan distribusi pupuk kelompok tani. Jadwal distribusi pada kios wilayah tidak sesuai informasi awal.","Pertanian","Tinggi","Ditutup","Rafi Pratama",new Date("2026-07-21T09:05:00Z"),null,"Jadwal baru telah dikonfirmasi oleh pelapor."],
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Laporan");
sheet.showGridLines = false;
sheet.getRange("A1:M1").merge();
sheet.getRange("A1").values = [["Tracking Laporan KSP Mendekat"]];
sheet.getRange("A2:M2").merge();
sheet.getRange("A2").values = [["Isi dan perbarui satu baris untuk setiap laporan. Data contoh di bawah bersifat fiktif."]];
sheet.getRange("A4:M4").values = [headers];
sheet.getRange(`A5:M${4 + records.length}`).values = records;
sheet.freezePanes.freezeRows(4);

sheet.getRange("A1:M1").format = { fill: "#12213A", font: { bold: true, color: "#FFFFFF", size: 18 }, verticalAlignment: "center" };
sheet.getRange("A1:M1").format.rowHeight = 34;
sheet.getRange("A2:M2").format = { fill: "#EDF1F5", font: { color: "#536277", size: 10 }, verticalAlignment: "center" };
sheet.getRange("A2:M2").format.rowHeight = 28;
sheet.getRange("A4:M4").format = { fill: "#C43B46", font: { bold: true, color: "#FFFFFF", size: 10 }, wrapText: true, verticalAlignment: "center" };
sheet.getRange("A4:M4").format.rowHeight = 34;
sheet.getRange(`A5:M${4 + records.length}`).format = { font: { color: "#24344F", size: 10 }, verticalAlignment: "top", wrapText: true, borders: { insideHorizontal: { style: "thin", color: "#DCE3E9" } } };
sheet.getRange(`B5:B${4 + records.length}`).format.numberFormat = "yyyy-mm-dd hh:mm";
sheet.getRange(`K5:K${4 + records.length}`).format.numberFormat = "yyyy-mm-dd hh:mm";
sheet.getRange(`L5:L${4 + records.length}`).format.numberFormat = "yyyy-mm-dd";
sheet.getRange(`H5:H200`).dataValidation = { rule: { type: "list", values: ["Mendesak","Tinggi","Normal","Rendah"] } };
sheet.getRange(`I5:I200`).dataValidation = { rule: { type: "list", values: ["Laporan masuk","Ditugaskan","Dalam penanganan","Menunggu pelapor","Selesai ditangani","Ditutup"] } };
sheet.getRange(`J5:J200`).dataValidation = { rule: { type: "list", values: ["Belum ditugaskan","Maya Putri","Rafi Pratama","Nina Larasati","Bagas Wicaksono"] } };
sheet.getRange(`I5:I200`).conditionalFormats.add("containsText", { text: "Dalam penanganan", format: { fill: "#FFF0D8", font: { color: "#8A5510", bold: true } } });
sheet.getRange(`I5:I200`).conditionalFormats.add("containsText", { text: "Ditutup", format: { fill: "#DDEFE4", font: { color: "#306B48", bold: true } } });
sheet.getRange(`I5:I200`).conditionalFormats.add("containsText", { text: "Selesai ditangani", format: { fill: "#DCEFEB", font: { color: "#1C746B", bold: true } } });

const widths = [18,19,19,18,26,58,19,13,22,20,19,19,42];
widths.forEach((width, index) => { sheet.getRangeByIndexes(0,index,4 + records.length,1).format.columnWidth = width; });
sheet.getRange(`A4:M${4 + records.length}`).format.autofitRows();
const table = sheet.tables.add(`A4:M${4 + records.length}`, true, "LaporanTable");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

const inspect = await workbook.inspect({ kind: "table", range: `Laporan!A1:M${4 + records.length}`, include: "values,formulas", tableMaxRows: 12, tableMaxCols: 13, maxChars: 7000 });
console.log(inspect.ndjson);
const preview = await workbook.render({ sheetName: "Laporan", range: `A1:M${4 + records.length}`, scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir,"Tracking_Laporan_KSP_Mendekat_preview.png"), new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir,"Tracking_Laporan_KSP_Mendekat.xlsx"));

const formatCsv = value => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().replace("T"," ").slice(0,16);
  return String(value).replaceAll(";",",").replaceAll("\n"," ");
};
const csvRows = [headers,...records].map(row => row.map((value,index) => index === 11 && value instanceof Date ? value.toISOString().slice(0,10) : formatCsv(value)).join(";")).join("\n");
await fs.writeFile(path.join(publicDataDir,"laporan-ksp-mendekat.csv"), csvRows, "utf8");
console.log(path.join(outputDir,"Tracking_Laporan_KSP_Mendekat.xlsx"));




