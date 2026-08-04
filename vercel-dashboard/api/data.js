const REQUIRED_HEADERS = [
  "No",
  "Tanggal Masuk",
  "Nama Pelapor",
  "Kategori Aduan",
  "Status Tindak Lanjut",
];

function sendJson(res, status, payload, cacheControl = "no-store") {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", cacheControl);
  res.end(JSON.stringify(payload));
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    const [headers = [], ...rows] = payload;
    return { headers, rows };
  }

  if (payload && Array.isArray(payload.headers) && Array.isArray(payload.rows)) {
    return { headers: payload.headers, rows: payload.rows, sourceLabel: payload.sourceLabel };
  }

  throw new Error("Apps Script harus mengirim JSON berbentuk { headers, rows }.");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const sheetApiUrl = process.env.SHEET_API_URL;
  if (!sheetApiUrl) {
    return sendJson(res, 503, {
      error: "SHEET_API_URL belum diisi di Vercel Environment Variables.",
    });
  }

  try {
    const upstream = await fetch(sheetApiUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const text = await upstream.text();

    if (!upstream.ok) {
      return sendJson(res, upstream.status, {
        error: "Google Sheets endpoint belum dapat dibaca.",
      });
    }

    const payload = JSON.parse(text);
    const normalized = normalizePayload(payload);
    const missing = REQUIRED_HEADERS.filter((header) => !normalized.headers.includes(header));

    if (missing.length) {
      return sendJson(res, 422, {
        error: `Kolom wajib belum ada: ${missing.join(", ")}`,
      });
    }

    const rows = normalized.rows.filter((row) => Array.isArray(row) && row.some(Boolean));
    return sendJson(
      res,
      200,
      {
        headers: normalized.headers,
        rows,
        rowCount: rows.length,
        sourceLabel: normalized.sourceLabel || `Google Sheets live · ${rows.length} entri`,
        updatedAt: new Date().toISOString(),
      },
      "s-maxage=30, stale-while-revalidate=120"
    );
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Gagal membaca Google Sheets.",
    });
  }
}