import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionUser } from "@/lib/auth";
import {
  cellToString,
  findHeaderRow,
  suggestMapping,
} from "@/lib/import-outreach";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Excel file required" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const sheetNames = wb.SheetNames;

    const preferred =
      sheetNames.find((n) => n.toLowerCase() === "outreach") ??
      sheetNames.find((n) => n.toLowerCase().includes("outreach")) ??
      sheetNames[0];

    const requested = String(form.get("sheet") ?? "").trim();
    const sheetName =
      requested && sheetNames.includes(requested) ? requested : preferred;

    if (!sheetName) {
      return NextResponse.json({ error: "No sheets found" }, { status: 400 });
    }

    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(
      sheet,
      { header: 1, defval: "", raw: false, dateNF: "yyyy-mm-dd" },
    ) as unknown[][];

    const headerRowIdx = findHeaderRow(matrix);
    const headerCells = (matrix[headerRowIdx] ?? []).map((c) =>
      cellToString(c),
    );
    // Drop trailing empty headers
    let last = headerCells.length - 1;
    while (last >= 0 && !headerCells[last]) last--;
    const headers = headerCells.slice(0, last + 1).map((h, i) => h || `Column ${i + 1}`);

    const dataRows = matrix
      .slice(headerRowIdx + 1)
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = cellToString((row as unknown[])[i]);
        });
        return obj;
      })
      .filter((row) => Object.values(row).some((v) => v.trim()));

    const mapping = suggestMapping(headers);

    return NextResponse.json({
      fileName: file.name,
      sheetNames,
      sheetName,
      headerRow: headerRowIdx + 1,
      headers,
      mapping,
      totalRows: dataRows.length,
      preview: dataRows.slice(0, 15),
      // keep all rows for commit in client (or re-upload). Cap for safety.
      rows: dataRows.slice(0, 2000),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not read Excel file" }, { status: 500 });
  }
}
