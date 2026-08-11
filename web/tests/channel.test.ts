import { describe, expect, it } from "vitest";
import { channelTone } from "@/components/channel-badge";

describe("channelTone", () => {
  it("WhatsApp jadi hijau, OCA jadi merah, Surat jadi kuning", () => {
    expect(channelTone("WhatsApp")).toBe("whatsapp");
    expect(channelTone("OCA")).toBe("oca");
    expect(channelTone("Surat")).toBe("surat");
  });

  it("tidak peduli huruf besar-kecil dan spasi berlebih", () => {
    // Nilai datang dari sheet yang diisi manusia, jadi ejaannya bisa beragam.
    for (const value of ["whatsapp", "WHATSAPP", "  WhatsApp  ", "wa"]) {
      expect(channelTone(value), value).toBe("whatsapp");
    }
    for (const value of ["oca", "OCA", " Oca "]) {
      expect(channelTone(value), value).toBe("oca");
    }
    for (const value of ["surat", "SURAT", " Surat "]) {
      expect(channelTone(value), value).toBe("surat");
    }
  });

  it("kanal tak dikenal jatuh ke netral, bukan dipaksa ke salah satu warna", () => {
    // Kalau nanti muncul kanal baru di sheet, ia harus tampil apa adanya —
    // bukan menyaru jadi WhatsApp atau OCA.
    expect(channelTone("Telegram")).toBe("netral");
    expect(channelTone("Email")).toBe("netral");
    expect(channelTone("")).toBe("netral");
  });

  it("tidak cocok sebagian", () => {
    // "OCA" tidak boleh cocok dengan kata yang kebetulan memuatnya.
    expect(channelTone("Advokasi")).toBe("netral");
    expect(channelTone("WhatsApp Business")).toBe("netral");
    // Begitu pula "Surat" di dalam frasa yang lebih panjang.
    expect(channelTone("Surat Elektronik")).toBe("netral");
  });
});
