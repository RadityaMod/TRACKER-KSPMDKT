/**
 * Parser CSV minimal yang menangani field ber-quote.
 *
 * Data KSP Mendekat memakai delimiter titik-koma dan memuat tanda kutip di
 * dalam sel (mis. baris 4: `"""."""`), juga titik-koma di dalam field
 * ber-quote. Karena itu split naif dengan `.split(";")` tidak cukup.
 */

export type Row = string[];

/** Deteksi delimiter dari baris pertama: ";" bila ada, selain itu ",". */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.includes(";") ? ";" : ",";
}

/**
 * Parse teks CSV menjadi array baris. Baris yang seluruh selnya kosong
 * dibuang. Quote ganda (`""`) di dalam field ber-quote jadi satu tanda kutip.
 */
export function parseCsv(text: string): Row[] {
  const delimiter = detectDelimiter(text);
  const rows: Row[] = [];

  let row: Row = [];
  let cell = "";
  let quoted = false;

  const pushCell = () => {
    row.push(cell.trim());
    cell = "";
  };

  const pushRow = () => {
    if (row.some((value) => value !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      pushCell();
    } else if (char === "\n") {
      cell = cell.replace(/\r$/, "");
      pushCell();
      pushRow();
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    pushCell();
    pushRow();
  }

  return rows;
}
