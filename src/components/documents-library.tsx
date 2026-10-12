"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Eye, FileText, Upload } from "lucide-react";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { DOC_TYPES, cn, formatBytes } from "@/lib/constants";

export type DocRow = {
  id: string;
  title: string;
  fileName: string | null;
  documentType: string;
  fileSize: number | null;
  mimeType: string | null;
  sharePointUrl: string | null;
  uploadedAt: string;
  leadId: string | null;
  leadCode: string | null;
  orgName: string | null;
  uploadedBy: string | null;
};

export function DocumentsLibrary({
  documents,
  leads,
  initialPreviewId,
  initialLeadId,
}: {
  documents: DocRow[];
  leads: { id: string; label: string }[];
  initialPreviewId?: string;
  initialLeadId?: string;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [leadFilter, setLeadFilter] = useState(initialLeadId ?? "all");
  const [previewId, setPreviewId] = useState<string | undefined>(
    initialPreviewId ?? documents[0]?.id,
  );
  const [pending, startTransition] = useTransition();
  const [docs, setDocs] = useState(documents);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (typeFilter !== "all" && d.documentType !== typeFilter) return false;
      if (leadFilter !== "all" && d.leadId !== leadFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        (d.fileName?.toLowerCase().includes(q) ?? false) ||
        (d.orgName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [docs, typeFilter, leadFilter, query]);

  const preview = filtered.find((d) => d.id === previewId) ?? filtered[0];

  async function onUpload(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error ?? "Upload failed");
        return;
      }
      const created = await res.json();
      setDocs((prev) => [created, ...prev]);
      setPreviewId(created.id);
      setMessage("Saved");
    });
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="In-app uploads and SharePoint links attached to leads."
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={leadFilter}
          onChange={(e) => setLeadFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
        >
          <option value="all">All leads</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Panel title="Add document">
            <form
              action={(fd) => onUpload(fd)}
              className="space-y-2 text-sm"
              encType="multipart/form-data"
            >
              <input
                name="title"
                required
                placeholder="Document title"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2"
              />
              <select
                name="documentType"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2"
                defaultValue="Other"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                name="leadId"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2"
                defaultValue={initialLeadId ?? ""}
              >
                <option value="">Library only</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <input
                name="sharePointUrl"
                placeholder="Or SharePoint URL"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2"
              />
              <input name="file" type="file" className="w-full text-xs" />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 font-medium text-white disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {pending ? "Saving…" : "Save"}
              </button>
              {message ? <p className="text-xs text-[var(--accent-ink)]">{message}</p> : null}
            </form>
          </Panel>

          <Panel title={`Library (${filtered.length})`} className="max-h-[560px] overflow-hidden">
            <ul className="-mx-1 max-h-[500px] space-y-1 overflow-y-auto px-1">
              {filtered.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setPreviewId(d.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition",
                      preview?.id === d.id
                        ? "bg-[var(--accent-soft)]"
                        : "hover:bg-[var(--surface)]",
                    )}
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className="block text-[11px] text-[var(--muted)]">
                        {d.documentType}
                        {d.orgName ? ` · ${d.orgName}` : " · Library"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="px-2 py-6 text-sm text-[var(--muted)]">No matches.</li>
              ) : null}
            </ul>
          </Panel>
        </div>

        <Panel
          title={preview ? preview.title : "Preview"}
          action={
            preview ? (
              <div className="flex items-center gap-3">
                {preview.fileName ? (
                  <a
                    href={`/api/documents/${preview.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent)]"
                  >
                    <Eye className="h-3.5 w-3.5" /> Open file
                  </a>
                ) : null}
                {preview.sharePointUrl ? (
                  <a
                    href={preview.sharePointUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--accent)]"
                  >
                    SharePoint
                  </a>
                ) : null}
                <button
                  type="button"
                  className="text-xs text-rose-700"
                  onClick={async () => {
                    if (!confirm(`Delete “${preview.title}”?`)) return;
                    const res = await fetch(`/api/documents/${preview.id}`, {
                      method: "DELETE",
                    });
                    if (!res.ok) {
                      setMessage("Delete failed");
                      return;
                    }
                    setDocs((prev) => prev.filter((d) => d.id !== preview.id));
                    setPreviewId(undefined);
                  }}
                >
                  Delete
                </button>
              </div>
            ) : null
          }
        >
          {!preview ? (
            <p className="text-sm text-[var(--muted)]">Select a document.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">{preview.documentType}</Badge>
                {preview.fileSize != null ? (
                  <Badge>{formatBytes(preview.fileSize)}</Badge>
                ) : null}
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[var(--muted)]">File</dt>
                  <dd>{preview.fileName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Uploaded</dt>
                  <dd>
                    {format(new Date(preview.uploadedAt), "dd MMM yyyy · HH:mm")}
                    {preview.uploadedBy ? ` · ${preview.uploadedBy}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Lead</dt>
                  <dd>
                    {preview.leadId ? (
                      <Link
                        href={`/leads/${preview.leadId}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {preview.leadCode} · {preview.orgName}
                      </Link>
                    ) : (
                      "Shared library"
                    )}
                  </dd>
                </div>
              </dl>
              {preview.mimeType?.startsWith("image/") && preview.fileName ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/documents/${preview.id}/file`}
                  alt={preview.title}
                  className="max-h-[520px] w-full object-contain"
                />
              ) : preview.mimeType === "application/pdf" && preview.fileName ? (
                <iframe
                  title={preview.title}
                  src={`/api/documents/${preview.id}/file`}
                  className="h-[520px] w-full bg-white"
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  Use Open file or SharePoint to view this document.
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
