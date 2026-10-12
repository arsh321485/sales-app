"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Badge, Panel } from "@/components/ui";
import { IMPORT_FIELDS, type ImportFieldKey } from "@/lib/import-outreach";

type PreviewPayload = {
  fileName: string;
  sheetNames: string[];
  sheetName: string;
  headerRow: number;
  headers: string[];
  mapping: Record<string, ImportFieldKey | "">;
  totalRows: number;
  preview: Record<string, string>[];
  rows: Record<string, string>[];
};

export function OutreachImportPanel({
  products,
}: {
  products: { id: string; name: string; code: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportFieldKey | "">>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<{
    success: number;
    skipped: number;
    skippedEmpty?: number;
    skippedDuplicate?: number;
    errors: number;
    errorLines: string[];
    productsCreated?: string[];
    message?: string;
  } | null>(null);

  const mappedHints = useMemo(() => {
    const values = Object.values(mapping);
    return {
      product: values.includes("product"),
      orgName: values.includes("orgName"),
      contactName: values.includes("contactName"),
      leadCode: values.includes("leadCode"),
    };
  }, [mapping]);

  async function onFile(file: File, sheet?: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    if (sheet) fd.append("sheet", sheet);
    const res = await fetch("/api/import/preview", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not read file");
      return;
    }
    setPreview(data);
    setMapping(data.mapping);
  }

  async function changeSheet(sheetName: string) {
    if (!preview) return;
    // Re-upload not available — ask user to re-select file; store last file via input ref instead
    const input = document.getElementById("outreach-file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError("Re-select the Excel file to change sheet");
      return;
    }
    await onFile(file, sheetName);
  }

  async function runImport() {
    if (!preview) return;
    if (
      !mappedHints.product &&
      !mappedHints.orgName &&
      !mappedHints.contactName &&
      !mappedHints.leadCode
    ) {
      setError("Map at least Lead ID, Product, Company, or Contact Name");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/import/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: preview.fileName,
        rows: preview.rows,
        mapping,
        skipDuplicates,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    setResult(data);
  }

  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">
            Add products in{" "}
            <Link href="/admin" className="text-[var(--accent)]">
              Settings
            </Link>{" "}
            before importing (Excel Product names like VaptFix / VF must match).
          </p>
        </Panel>
      ) : null}

      <Panel title="1. Upload Outreach Excel">
        <p className="mb-3 text-sm text-[var(--muted)]">
          Use your <strong>Sales_Pipeline_Tracker.xlsx</strong> file. We read the{" "}
          <strong>Outreach</strong> sheet by default and auto-map its columns
          (Lead ID, Product, Company, Contact Name, …).
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
          <Upload className="h-4 w-4" />
          {busy ? "Reading…" : "Choose .xlsx / .xls / .csv"}
          <input
            id="outreach-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
        {preview ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Loaded <strong>{preview.fileName}</strong> · sheet{" "}
            <strong>{preview.sheetName}</strong> · header row {preview.headerRow} ·{" "}
            {preview.totalRows} data rows (import capped at 2000)
          </p>
        ) : null}
        {preview && preview.sheetNames.length > 1 ? (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Sheet</span>
            <select
              className="w-full max-w-sm rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={preview.sheetName}
              onChange={(e) => void changeSheet(e.target.value)}
            >
              {preview.sheetNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </Panel>

      {preview ? (
        <Panel title="2. Map columns (Outreach defaults applied)">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Blue Excel headers should already be mapped. Change any mapping if your
            headers differ. Leave as “— skip —” to ignore a column.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[11px] uppercase text-[var(--muted)]">
                <tr>
                  <th className="pb-2 pr-3">Excel column</th>
                  <th className="pb-2">Maps to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {preview.headers.map((h) => (
                  <tr key={h}>
                    <td className="py-2 pr-3 font-medium">{h}</td>
                    <td className="py-2">
                      <select
                        className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
                        value={mapping[h] ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [h]: e.target.value as ImportFieldKey | "",
                          }))
                        }
                      >
                        <option value="">— skip —</option>
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                            {f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge tone={mappedHints.leadCode ? "ok" : "neutral"}>
              Lead ID {mappedHints.leadCode ? "mapped" : "optional"}
            </Badge>
            <Badge tone={mappedHints.product ? "ok" : "neutral"}>
              Product {mappedHints.product ? "mapped" : "optional"}
            </Badge>
            <Badge tone={mappedHints.orgName ? "ok" : "neutral"}>
              Company {mappedHints.orgName ? "mapped" : "optional"}
            </Badge>
            <Badge tone={mappedHints.contactName ? "ok" : "neutral"}>
              Contact {mappedHints.contactName ? "mapped" : "optional"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Company and Contact can be empty in Excel — those rows still import
            (placeholders used). Only fully blank rows are skipped.
          </p>
        </Panel>
      ) : null}

      {preview ? (
        <Panel title="3. Preview (first rows)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-[var(--border)] text-[10px] uppercase text-[var(--muted)]">
                <tr>
                  {preview.headers.slice(0, 8).map((h) => (
                    <th key={h} className="pb-2 pr-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {preview.preview.slice(0, 8).map((row, idx) => (
                  <tr key={idx}>
                    {preview.headers.slice(0, 8).map((h) => (
                      <td key={h} className="max-w-[140px] truncate py-1.5 pr-2">
                        {row[h] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {preview ? (
        <Panel title="4. Run import">
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
            />
            Skip rows whose Lead ID already exists
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runImport()}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Importing…" : `Import ${preview.rows.length} rows`}
          </button>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Creates Organization + Contact + Lead per row. Lead IDs from Excel are
            kept when present; otherwise the next product ID (VF001…) is generated.
            Missing Company/Contact is OK. Products are auto-created when needed
            (VaptFix, GRCMentor, …).
          </p>
        </Panel>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {result ? (
        <Panel title="Import result">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="ok">Created {result.success}</Badge>
            <Badge tone="warn">Skipped {result.skipped}</Badge>
            {result.skippedDuplicate != null ? (
              <Badge tone="warn">Already in app {result.skippedDuplicate}</Badge>
            ) : null}
            {result.skippedEmpty != null ? (
              <Badge tone="neutral">Blank rows {result.skippedEmpty}</Badge>
            ) : null}
            <Badge tone={result.errors ? "danger" : "neutral"}>
              Errors {result.errors}
            </Badge>
            {result.productsCreated && result.productsCreated.length > 0 ? (
              <Badge tone="info">
                Products added: {result.productsCreated.join(", ")}
              </Badge>
            ) : null}
          </div>
          {result.message ? (
            <p className="mb-2 text-sm text-[var(--muted)]">{result.message}</p>
          ) : null}
          {result.success > 0 || (result.skippedDuplicate ?? 0) > 0 ? (
            <p className="mb-2 text-sm">
              Your leads are ready — open{" "}
              <Link href="/leads" className="text-[var(--accent)]">
                Leads
              </Link>{" "}
              or{" "}
              <Link href="/" className="text-[var(--accent)]">
                My Work
              </Link>
              . No need to import the same file again.
            </p>
          ) : null}
          {result.errorLines.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-rose-800">
              {result.errorLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
