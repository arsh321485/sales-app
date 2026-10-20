"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel } from "@/components/ui";
import {
  BUSINESS_MODELS,
  BUSINESS_STAGES,
  COMPANY_TYPES,
  EMPLOYEE_RANGES,
  RESEARCH_STATUSES,
} from "@/lib/research";

const field = "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";
const btn = "rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

function L({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={`text-sm ${span ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

export function ResearchNewForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/research/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data: { id?: string; error?: string } = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      setError(data.error ?? "Could not create organization");
      setBusy(false);
      return;
    }
    router.push(`/research/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Panel title="Quick start from website">
        <div className="grid gap-3 sm:grid-cols-2">
          <L label="Website domain">
            <input name="websiteDomain" className={field} placeholder="example.com" />
          </L>
          <p className="self-end text-sm text-[var(--muted)]">
            Create the org first, then open it and use <strong>Enrich from website</strong> on the
            detail page to pull description, phone, LinkedIn and published emails as sourced claims.
          </p>
        </div>
      </Panel>

      <Panel title="Identity">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <L label="Company name *"><input name="orgName" className={field} placeholder="Required unless domain given" /></L>
          <L label="Trading name"><input name="tradingName" className={field} /></L>
          <L label="LinkedIn company URL"><input name="linkedinCompanyUrl" className={field} placeholder="https://www.linkedin.com/company/…" /></L>
          <L label="Registration number"><input name="registrationNumber" className={field} /></L>
          <L label="Registry source"><input name="registrySource" className={field} placeholder="e.g. MCA / Companies House" /></L>
          <L label="Founded year"><input name="foundedYear" type="number" min={1800} max={2100} className={field} /></L>
        </div>
      </Panel>

      <Panel title="Headquarters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <L label="Street"><input name="hqStreet" className={field} /></L>
          <L label="City"><input name="city" className={field} /></L>
          <L label="State / Region"><input name="state" className={field} /></L>
          <L label="HQ country"><input name="country" className={field} defaultValue="India" /></L>
          <L label="Operating countries" span><input name="operatingCountries" className={field} placeholder="India, UAE, United States" /></L>
        </div>
      </Panel>

      <Panel title="Classification">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <L label="Industry"><input name="industry" className={field} /></L>
          <L label="Sub-industry"><input name="subIndustry" className={field} /></L>
          <L label="Company type">
            <select name="companyType" className={field} defaultValue=""><option value="">—</option>{COMPANY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Legal form"><input name="legalForm" className={field} placeholder="Pvt Ltd / LLC / PLC…" /></L>
          <L label="Business stage">
            <select name="businessStage" className={field} defaultValue=""><option value="">—</option>{BUSINESS_STAGES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Employee count"><input name="employeeCount" type="number" min={0} className={field} /></L>
          <L label="Employee range">
            <select name="employeeRange" className={field} defaultValue=""><option value="">Auto from count / —</option>{EMPLOYEE_RANGES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Business model">
            <select name="businessModel" className={field} defaultValue=""><option value="">—</option>{BUSINESS_MODELS.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
          <L label="Research status">
            <select name="researchStatus" className={field} defaultValue="Draft">{RESEARCH_STATUSES.map((t) => <option key={t}>{t}</option>)}</select>
          </L>
        </div>
      </Panel>

      <Panel title="Profile">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <L label="Description" span><textarea name="description" rows={3} className={field} /></L>
          <L label="Products & services"><textarea name="productsServices" rows={2} className={field} /></L>
          <L label="Target customers"><textarea name="targetCustomers" rows={2} className={field} /></L>
          <L label="Main markets"><input name="mainMarkets" className={field} /></L>
          <L label="Parent company"><input name="parentName" className={field} /></L>
          <L label="Public phone"><input name="publicPhone" className={field} /></L>
          <L label="Notes"><textarea name="notes" rows={2} className={field} /></L>
        </div>
      </Panel>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button type="submit" disabled={busy} className={btn}>{busy ? "Creating…" : "Create research org"}</button>
    </form>
  );
}
