import { afterEach, describe, expect, it } from "vitest";
import {
  describeSheetError,
  padRows,
  readGoogleSheetConfig,
} from "@/lib/data/google-sheet";

const KEYS = ["SHEET_ID", "SHEET_RANGE", "GOOGLE_SERVICE_ACCOUNT_JSON"] as const;

function setEnv(values: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
}

function serviceAccount(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: "service_account",
    client_email: "tracker@contoh.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\\nAAA\\nBBB\\n-----END PRIVATE KEY-----\\n",
    ...overrides,
  });
}

afterEach(() => setEnv({}));

describe("readGoogleSheetConfig", () => {
  it("mengembalikan null bila env kosong, supaya fallback ke CSV lokal", () => {
    setEnv({});
    expect(readGoogleSheetConfig()).toBeNull();
  });

  it("mengembalikan null bila hanya SHEET_ID yang diisi", () => {
    setEnv({ SHEET_ID: "id-contoh" });
    expect(readGoogleSheetConfig()).toBeNull();
  });

  it("membaca konfigurasi lengkap", () => {
    setEnv({
      SHEET_ID: "id-contoh",
      SHEET_RANGE: "Tracker!A:R",
      GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccount(),
    });

    const config = readGoogleSheetConfig()!;
    expect(config.spreadsheetId).toBe("id-contoh");
    expect(config.range).toBe("Tracker!A:R");
    expect(config.clientEmail).toBe("tracker@contoh.iam.gserviceaccount.com");
  });

  it("memakai rentang default bila SHEET_RANGE tidak diisi", () => {
    setEnv({ SHEET_ID: "id-contoh", GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccount() });
    expect(readGoogleSheetConfig()!.range).toBe("Sheet1!A:Z");
  });

  it("memperlebar rentang lama A:N agar kolom baru tetap terbaca", () => {
    setEnv({
      SHEET_ID: "id-contoh",
      SHEET_RANGE: "Tracker!A:N",
      GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccount(),
    });
    expect(readGoogleSheetConfig()!.range).toBe("Tracker!A:Z");
  });

  it("mempertahankan kutip tunggal untuk nama tab berspasi", () => {
    setEnv({
      SHEET_ID: "id-contoh",
      SHEET_RANGE: "'Tracker Pelapor KSP Mendekat'!A:N",
      GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccount(),
    });
    expect(readGoogleSheetConfig()!.range).toBe(
      "'Tracker Pelapor KSP Mendekat'!A:Z",
    );
  });

  it("mengubah \\n literal jadi newline sungguhan di private key", () => {
    setEnv({ SHEET_ID: "id-contoh", GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccount() });

    const key = readGoogleSheetConfig()!.privateKey;
    expect(key).toContain("\n");
    expect(key).not.toContain("\\n");
    expect(key.split("\n").length).toBeGreaterThan(3);
  });

  it("melempar pesan jelas bila JSON rusak", () => {
    setEnv({ SHEET_ID: "id-contoh", GOOGLE_SERVICE_ACCOUNT_JSON: "{bukan json" });
    expect(() => readGoogleSheetConfig()).toThrow(/bukan JSON yang valid/i);
  });

  it("melempar pesan jelas bila client_email atau private_key hilang", () => {
    setEnv({
      SHEET_ID: "id-contoh",
      GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: "service_account" }),
    });
    expect(() => readGoogleSheetConfig()).toThrow(/client_email/);
  });
});

describe("padRows", () => {
  it("memanjangkan baris pendek agar sepanjang header", () => {
    // Sheets API memangkas sel kosong di ujung kanan.
    expect(padRows([["a", "b", "c"], ["1"]])).toEqual([
      ["a", "b", "c"],
      ["1", "", ""],
    ]);
  });

  it("membiarkan baris yang sudah sepanjang header", () => {
    expect(padRows([["a", "b"], ["1", "2"]])).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("tidak memotong baris yang lebih panjang dari header", () => {
    expect(padRows([["a"], ["1", "2"]])).toEqual([["a"], ["1", "2"]]);
  });

  it("aman untuk input kosong", () => {
    expect(padRows([])).toEqual([]);
  });
});

describe("describeSheetError", () => {
  const email = "tracker@contoh.iam.gserviceaccount.com";

  it("403 menyebutkan email service account yang perlu di-share", () => {
    const message = describeSheetError(
      Object.assign(new Error("Forbidden"), { code: 403 }),
      email,
    );
    expect(message).toContain("403");
    expect(message).toContain(email);
  });

  it("404 mengarahkan ke SHEET_ID", () => {
    const message = describeSheetError(
      Object.assign(new Error("Not Found"), { code: 404 }),
      email,
    );
    expect(message).toContain("SHEET_ID");
  });

  it("429 menyebut kuota", () => {
    const message = describeSheetError(
      Object.assign(new Error("Too Many Requests"), { code: 429 }),
      email,
    );
    expect(message).toMatch(/kuota/i);
  });

  it("error tanpa kode tetap menyertakan detail aslinya", () => {
    const message = describeSheetError(new Error("socket hang up"), email);
    expect(message).toContain("socket hang up");
  });
});
