"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Panel } from "@/components/ui";
import {
  BUSINESS_MODELS,
  BUSINESS_STAGES,
  COMPANY_TYPES,
  DEPARTMENTS,
  EMPLOYEE_RANGES,
  RESEARCH_STATUSES,
  SENIORITIES,
} from "@/lib/research";

export type ResearchOrgDetail = {
  id: string;
  orgName: string;
  tradingName: string | null;
  websiteDomain: string | null;
  linkedinCompanyUrl: string | null;
  industry: string | null;
  subIndustry: string | null;
  city: string | null;
  state: string | null;
  country: string;
  hqStreet: string | null;
  operatingCountries: string | null;
  companyType: string | null;
  legalForm: string | null;
  parentName: string | null;
  description: string | null;
  businessModel: string | null;
  productsServices: string | null;
  targetCustomers: string | null;
  mainMarkets: string | null;
  employeeCount: number | null;
  employeeRange: string | null;
  businessStage: string | null;
  publicPhone: string | null;
  foundedYear: number | null;
  registrationNumber: string | null;
  registrySource: string | null;
  researchStatus: string;
  lastVerifiedAt: string | null;
  notes: string | null;
};

export type ResearchContact = {
  id: string;
  fullName: string;
  designation: string | null;
  department: string | null;
  seniority: string | null;
  contactCity: string | null;
  contactCountry: string | null;
  email: string | null;
  emailVerificationStatus: string | null;
  emailVerifiedAt: string | null;
  emailOrigin: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  sourceUrl: string | null;
};

export type ResearchClaim = {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  value: string | null;
  sourceName: string;
  sourceUrl: string | null;
  method: string;
  confidence: number;
  retrievedAt: string;
  createdAt: string;
};

export type ResearchJobItem = {
  id: string;
  jobType: string;
  status: string;
  summary: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

type SimpleItem = { id: string; name: string; code?: string };

const field = "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";
const btn = "rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60";
const btnGhost = "rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm disabled:opacity-60";

function L({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={`text-sm ${span ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function emailTone(s: string | null): "ok" | "warn" | "danger" | "neutral" {
  if (s === "Valid") return "ok";
  if (s === "Accept-all") return "warn";
  if (s === "Invalid") return "danger";
  return "neutral";
}

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB") : "—";
}

export function ResearchDetail({
  org,
  contacts,
  claims,
  jobs,
  products,
}: {
  org: ResearchOrgDetail;
  contacts: ResearchContact[];
  claims: ResearchClaim[];
  jobs: ResearchJobItem[];
  products: SimpleItem[];
  users: SimpleItem[];
  isManager: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Enrich
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [publishedEmails, setPublishedEmails] = useState<string[]>([]);
  const [enrichSummary, setEnrichSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Per-contact convert / verify state
  const [convertProduct, setConvertProduct] = useState<Record<string, string>>({});
  const [converted, setConverted] = useState<Record<string, { leadId: string; leadCode: string }>>({});
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [verifyResult, setVerifyResult] = useState<Record<string, string>>({});

  async function enrich() {
    setEnriching(true);
    setEnrichError(null);
    setEnrichSummary(null);
    const res = await fetch(`/api/research/organizations/${org.id}/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data: {
      error?: string;
      publishedEmails?: string[];
      suggestions?: string[];
      published?: string[];
      job?: { summary?: string | null };
    } = await res.json().catch(() => ({}));
    setEnriching(false);
    if (!res.ok) {
      setEnrichError(data.error ?? "Enrichment failed");
      return;
    }
    setPublishedEmails(data.publishedEmails ?? data.suggestions ?? []);
    setEnrichSummary(
      data.job?.summary ??
        `Published fields: ${(data.published ?? []).join(", ") || "none"}`,
    );
    router.refresh();
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((c) => (c === text ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  }

  async function saveOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(`/api/research/organizations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save organization");
      return;
    }
    setNotice("Company saved — fields recorded as provenance claims.");
    router.refresh();
  }

  async function addContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const payload = Object.fromEntries(new FormData(form).entries());
    const res = await fetch(`/api/research/organizations/${org.id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add contact");
      return;
    }
    form.reset();
    setNotice("Contact added.");
    router.refresh();
  }

  async function verifyEmail(contact: ResearchContact) {
    if (!contact.email) return;
    setRowBusy(contact.id);
    setRowError((p) => ({ ...p, [contact.id]: "" }));
    const res = await fetch("/api/research/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: contact.email, contactId: contact.id }),
    });
    const data: { error?: string; status?: string; detail?: string } =
      await res.json().catch(() => ({}));
    setRowBusy(null);
    if (!res.ok) {
      setRowError((p) => ({ ...p, [contact.id]: data.error ?? "Verify failed" }));
      return;
    }
    setVerifyResult((p) => ({
      ...p,
      [contact.id]: `${data.status ?? "Checked"}${data.detail ? ` — ${data.detail}` : ""}`,
    }));
    router.refresh();
  }

  async function convert(contact: ResearchContact) {
    const productId = convertProduct[contact.id] || products[0]?.id || "";
    if (!productId) {
      setRowError((p) => ({ ...p, [contact.id]: "No product available" }));
      return;
    }
    setRowBusy(contact.id);
    setRowError((p) => ({ ...p, [contact.id]: "" }));
    const res = await fetch(`/api/research/organizations/${org.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id, productId }),
    });
    const data: { error?: string; leadId?: string; id?: string; leadCode?: string } =
      await res.json().catch(() => ({}));
    setRowBusy(null);
    const leadId = data.leadId ?? data.id;
    if (!res.ok || !leadId) {
      setRowError((p) => ({ ...p, [contact.id]: data.error ?? "Convert failed" }));
      return;
    }
    setConverted((p) => ({ ...p, [contact.id]: { leadId, leadCode: data.leadCode ?? leadId } }));
  }

  async function deleteContact(contact: ResearchContact) {
    if (!window.confirm(`Delete contact ${contact.fullName}?`)) return;
    setRowBusy(contact.id);
    const res = await fetch(`/api/research/contacts?id=${encodeURIComponent(contact.id)}`, {
      method: "DELETE",
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    setRowBusy(null);
    if (!res.ok) {
      setRowError((p) => ({ ...p, [contact.id]: data.error ?? "Delete failed" }));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Enrich */}
      <Panel
        title="Enrich from website"
        action={
          <button type="button" onClick={enrich} disabled={enriching || !org.websiteDomain} className={btn}>
            {enriching ? "Enriching…" : "Enrich"}
          </button>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          {org.websiteDomain
            ? `Fetches ${org.websiteDomain}, records sourced claims and auto-publishes high-confidence company fields.`
            : "Add a website domain in the form below before enriching."}
        </p>
        {enrichError ? <p className="mt-2 text-sm text-rose-700">{enrichError}</p> : null}
        {enrichSummary ? <p className="mt-2 text-sm text-emerald-800">{enrichSummary}</p> : null}
        {publishedEmails.length > 0 ? (
          <div className="mt-3">
            <p className="text-sm font-medium">Suggested published emails</p>
            <ul className="mt-1 space-y-1">
              {publishedEmails.map((email) => (
                <li key={email} className="flex items-center gap-2 text-sm">
                  <code className="rounded bg-slate-100 px-2 py-0.5">{email}</code>
                  <button type="button" onClick={() => copyText(email)} className="text-[var(--accent-ink)] hover:underline">
                    {copied === email ? "Copied!" : "Copy"}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => copyText(publishedEmails.join(", "))}
              className="mt-2 text-sm text-[var(--accent-ink)] hover:underline"
            >
              Copy all
            </button>
          </div>
        ) : null}
      </Panel>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}

      {/* Edit company */}
      <Panel title="Company profile">
        <form onSubmit={saveOrg} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <L label="Company name *"><input name="orgName" required defaultValue={org.orgName} className={field} /></L>
          <L label="Trading name"><input name="tradingName" defaultValue={org.tradingName ?? ""} className={field} /></L>
          <L label="Website domain"><input name="websiteDomain" defaultValue={org.websiteDomain ?? ""} className={field} /></L>
          <L label="LinkedIn company URL"><input name="linkedinCompanyUrl" defaultValue={org.linkedinCompanyUrl ?? ""} className={field} /></L>
          <L label="Registration number"><input name="registrationNumber" defaultValue={org.registrationNumber ?? ""} className={field} /></L>
          <L label="Registry source"><input name="registrySource" defaultValue={org.registrySource ?? ""} className={field} /></L>
          <L label="Founded year"><input name="foundedYear" type="number" min={1800} max={2100} defaultValue={org.foundedYear ?? ""} className={field} /></L>
          <L label="Street"><input name="hqStreet" defaultValue={org.hqStreet ?? ""} className={field} /></L>
          <L label="City"><input name="city" defaultValue={org.city ?? ""} className={field} /></L>
          <L label="State / Region"><input name="state" defaultValue={org.state ?? ""} className={field} /></L>
          <L label="HQ country"><input name="country" defaultValue={org.country} className={field} /></L>
          <L label="Operating countries"><input name="operatingCountries" defaultValue={org.operatingCountries ?? ""} className={field} /></L>
          <L label="Industry"><input name="industry" defaultValue={org.industry ?? ""} className={field} /></L>
          <L label="Sub-industry"><input name="subIndustry" defaultValue={org.subIndustry ?? ""} className={field} /></L>
          <L label="Company type">
            <select name="companyType" className={field} defaultValue={org.companyType ?? ""}><option value="">—</option>{COMPANY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Legal form"><input name="legalForm" defaultValue={org.legalForm ?? ""} className={field} /></L>
          <L label="Business stage">
            <select name="businessStage" className={field} defaultValue={org.businessStage ?? ""}><option value="">—</option>{BUSINESS_STAGES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Employee count"><input name="employeeCount" type="number" min={0} defaultValue={org.employeeCount ?? ""} className={field} /></L>
          <L label="Employee range">
            <select name="employeeRange" className={field} defaultValue={org.employeeRange ?? ""}><option value="">Auto / —</option>{EMPLOYEE_RANGES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Business model">
            <select name="businessModel" className={field} defaultValue={org.businessModel ?? ""}><option value="">—</option>{BUSINESS_MODELS.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Research status">
            <select name="researchStatus" className={field} defaultValue={org.researchStatus}>{RESEARCH_STATUSES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Parent company"><input name="parentName" defaultValue={org.parentName ?? ""} className={field} /></L>
          <L label="Public phone"><input name="publicPhone" defaultValue={org.publicPhone ?? ""} className={field} /></L>
          <L label="Description" span><textarea name="description" rows={3} defaultValue={org.description ?? ""} className={field} /></L>
          <L label="Products & services"><textarea name="productsServices" rows={2} defaultValue={org.productsServices ?? ""} className={field} /></L>
          <L label="Target customers"><textarea name="targetCustomers" rows={2} defaultValue={org.targetCustomers ?? ""} className={field} /></L>
          <L label="Main markets"><input name="mainMarkets" defaultValue={org.mainMarkets ?? ""} className={field} /></L>
          <L label="Notes"><textarea name="notes" rows={2} defaultValue={org.notes ?? ""} className={field} /></L>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={busy} className={btn}>{busy ? "Saving…" : "Save company"}</button>
          </div>
        </form>
      </Panel>

      {/* Contacts */}
      <Panel title={`Contacts (${contacts.length})`}>
        {contacts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No contacts yet — add one below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[var(--muted)]">
                <tr>
                  <th className="pb-2 pr-3">Name</th><th className="pb-2 pr-3">Title</th>
                  <th className="pb-2 pr-3">Dept</th><th className="pb-2 pr-3">Seniority</th>
                  <th className="pb-2 pr-3">Location</th><th className="pb-2 pr-3">Email</th>
                  <th className="pb-2 pr-3">LinkedIn</th><th className="pb-2 pr-3">Source</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {contacts.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="py-2 pr-3 font-medium">{c.fullName}</td>
                    <td className="py-2 pr-3">{c.designation || "—"}</td>
                    <td className="py-2 pr-3">{c.department || "—"}</td>
                    <td className="py-2 pr-3">{c.seniority || "—"}</td>
                    <td className="py-2 pr-3">{[c.contactCity, c.contactCountry].filter(Boolean).join(", ") || "—"}</td>
                    <td className="py-2 pr-3">
                      {c.email ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span>{c.email}</span>
                          {c.emailVerificationStatus ? <Badge tone={emailTone(c.emailVerificationStatus)}>{c.emailVerificationStatus}</Badge> : null}
                        </span>
                      ) : "—"}
                      {verifyResult[c.id] ? <p className="mt-1 text-xs text-[var(--muted)]">{verifyResult[c.id]}</p> : null}
                    </td>
                    <td className="py-2 pr-3">{c.linkedinUrl ? <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-ink)] hover:underline">Profile</a> : "—"}</td>
                    <td className="py-2 pr-3">{c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-ink)] hover:underline">Source</a> : c.emailOrigin ? <span className="capitalize">{c.emailOrigin}</span> : "—"}</td>
                    <td className="py-2">
                      <div className="flex min-w-52 flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {c.email ? (
                            <button type="button" disabled={rowBusy === c.id} onClick={() => verifyEmail(c)} className={btnGhost}>Verify email</button>
                          ) : null}
                          <button type="button" disabled={rowBusy === c.id} onClick={() => deleteContact(c)} className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700 disabled:opacity-60">Delete</button>
                        </div>
                        {converted[c.id] ? (
                          <Link href={`/leads/${converted[c.id].leadId}`} className="text-sm font-medium text-[var(--accent-ink)] hover:underline">
                            View lead {converted[c.id].leadCode} →
                          </Link>
                        ) : (
                          <div className="flex gap-1.5">
                            <select
                              aria-label="Product"
                              className={`${field} min-w-32`}
                              value={convertProduct[c.id] || products[0]?.id || ""}
                              onChange={(e) => setConvertProduct((p) => ({ ...p, [c.id]: e.target.value }))}
                            >
                              {products.length === 0 ? <option value="">No products</option> : null}
                              {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>)}
                            </select>
                            <button type="button" disabled={rowBusy === c.id || products.length === 0} onClick={() => convert(c)} className={btn}>Convert</button>
                          </div>
                        )}
                        {rowError[c.id] ? <p className="text-xs text-rose-700">{rowError[c.id]}</p> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Add contact */}
      <Panel title="Add contact">
        <p className="mb-3 text-sm text-[var(--muted)]">
          Department &amp; seniority are auto-classified from the designation when left blank.
          Personal email domains are blocked; suppressed contacts are rejected.
        </p>
        <form onSubmit={addContact} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <L label="Full name *"><input name="fullName" required className={field} /></L>
          <L label="Designation"><input name="designation" className={field} placeholder="e.g. CISO, VP Sales" /></L>
          <L label="Department">
            <select name="department" className={field} defaultValue=""><option value="">Auto from title</option>{DEPARTMENTS.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Seniority">
            <select name="seniority" className={field} defaultValue=""><option value="">Auto from title</option>{SENIORITIES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="City"><input name="contactCity" className={field} /></L>
          <L label="Country"><input name="contactCountry" className={field} /></L>
          <L label="Email"><input name="email" type="email" className={field} /></L>
          <L label="LinkedIn URL"><input name="linkedinUrl" className={field} /></L>
          <L label="Source URL"><input name="sourceUrl" className={field} placeholder="Where this was found" /></L>
          <L label="Email origin">
            <select name="emailOrigin" className={field} defaultValue="published">
              <option value="published">Published</option>
              <option value="inferred">Inferred</option>
              <option value="feed">Licensed feed</option>
            </select>
          </L>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={busy} className={btn}>{busy ? "Saving…" : "Add contact"}</button>
          </div>
        </form>
      </Panel>

      {/* Claims */}
      <Panel title={`Provenance / Claims (${claims.length})`}>
        {claims.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No claims recorded yet. Saving the company, adding contacts or enriching records claims here.</p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase text-[var(--muted)]">
                <tr><th className="pb-2 pr-3">Field</th><th className="pb-2 pr-3">Value</th><th className="pb-2 pr-3">Source</th><th className="pb-2 pr-3">Method</th><th className="pb-2 pr-3">Confidence</th><th className="pb-2">Retrieved</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {claims.map((claim) => (
                  <tr key={claim.id} className="align-top">
                    <td className="py-2 pr-3 font-medium">{claim.field}<span className="block text-xs font-normal text-[var(--muted)]">{claim.entityType}</span></td>
                    <td className="max-w-64 break-words py-2 pr-3">{claim.value || "—"}</td>
                    <td className="py-2 pr-3">{claim.sourceUrl ? <a href={claim.sourceUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-ink)] hover:underline">{claim.sourceName}</a> : claim.sourceName}</td>
                    <td className="py-2 pr-3">{claim.method}</td>
                    <td className="py-2 pr-3">{Math.round(claim.confidence * 100)}%</td>
                    <td className="whitespace-nowrap py-2">{fmtDate(claim.retrievedAt || claim.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Jobs */}
      <Panel title={`Research jobs (${jobs.length})`}>
        {jobs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No research jobs yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border)] pb-2 last:border-0">
                <div>
                  <span className="font-medium">{job.jobType}</span>{" "}
                  <Badge tone={job.status === "Completed" ? "ok" : job.status === "Failed" ? "danger" : "neutral"}>{job.status}</Badge>
                  {job.summary ? <p className="mt-1 text-[var(--muted)]">{job.summary}</p> : null}
                  {job.error ? <p className="mt-1 text-rose-700">{job.error}</p> : null}
                </div>
                <span className="text-xs text-[var(--muted)]">{fmtDate(job.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
