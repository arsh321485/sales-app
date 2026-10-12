"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REQUEST_TYPES, SALES_STAGES, TEMPERATURES } from "@/lib/constants";
import { Badge, Panel } from "@/components/ui";

const field =
  "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

type ResourceLite = {
  id: string;
  title: string;
  resourceType: string;
  sharePointUrl: string;
};

type LeadWorkspaceProps = {
  leadId: string;
  salesStage: string;
  temperature: string | null;
  isManager: boolean;
  users: { id: string; name: string }[];
  followUps: {
    id: string;
    followUpNumber: number;
    status: string;
    dueAt: string | null;
    notes: string | null;
  }[];
  meetings: {
    id: string;
    meetingType: string | null;
    status: string;
    scheduledAt: string | null;
    outcome: string | null;
  }[];
  demos: {
    id: string;
    status: string;
    scheduledAt: string | null;
    interestLevel: string | null;
  }[];
  requirements: {
    id: string;
    requirementType: string | null;
    description: string | null;
    status: string;
  }[];
  clientRequests: {
    id: string;
    title: string;
    requestType: string;
    status: string;
    resource: ResourceLite | null;
  }[];
  opportunities: {
    id: string;
    opportunityValue: number | null;
    probability: number | null;
    salesStage: string;
    negotiationStatus: string | null;
  }[];
  activities: {
    id: string;
    activityType: string;
    title: string;
    detail: string | null;
    occurredAt: string;
  }[];
};

export function LeadWorkspace(props: LeadWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "qualify" | "followup" | "meeting" | "demo" | "requirement" | "request" | "opportunity" | "stage"
  >("followup");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function call(url: string, body: Record<string, unknown>, method = "POST") {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? "Failed");
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  const tabs = [
    { id: "qualify" as const, label: "Qualify" },
    { id: "followup" as const, label: "Follow-up" },
    { id: "meeting" as const, label: "Meeting" },
    { id: "demo" as const, label: "Demo" },
    { id: "requirement" as const, label: "Requirement" },
    { id: "request" as const, label: "Client request" },
    { id: "opportunity" as const, label: "Opportunity" },
    { id: "stage" as const, label: "Stage / close" },
  ];

  return (
    <div className="space-y-4">
      <Panel title="Activities (any order)">
        <div className="mb-4 flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                tab === t.id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "qualify" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void call(`/api/leads/${props.leadId}`, {
                action: "qualify",
                temperature: fd.get("temperature"),
                ownerId: fd.get("ownerId") || undefined,
                nextAction: fd.get("nextAction"),
                nextFollowUpAt: fd.get("nextFollowUpAt") || undefined,
              }, "PATCH");
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Temperature</span>
              <select name="temperature" className={field} defaultValue={props.temperature ?? "Warm"}>
                {TEMPERATURES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            {props.isManager ? (
              <label className="text-sm">
                <span className="mb-1 block text-[var(--muted)]">Assign owner</span>
                <select name="ownerId" className={field} defaultValue="">
                  <option value="">Keep / me</option>
                  {props.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Next action</span>
              <input name="nextAction" className={field} defaultValue="Plan next activity" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Next follow-up</span>
              <input name="nextFollowUpAt" type="datetime-local" className={field} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Mark qualified
              </button>
            </div>
          </form>
        )}

        {tab === "followup" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void call("/api/followups", {
                leadId: props.leadId,
                dueAt: fd.get("dueAt") || undefined,
                notes: fd.get("notes"),
                nextAction: fd.get("nextAction"),
              });
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Due</span>
              <input name="dueAt" type="datetime-local" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Next action</span>
              <input name="nextAction" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Notes</span>
              <textarea name="notes" rows={2} className={field} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Log follow-up
              </button>
            </div>
          </form>
        )}

        {tab === "meeting" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void call("/api/meetings", {
                leadId: props.leadId,
                meetingType: fd.get("meetingType"),
                scheduledAt: fd.get("scheduledAt") || undefined,
                participants: fd.get("participants"),
                notes: fd.get("notes"),
              });
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Type</span>
              <select name="meetingType" className={field} defaultValue="Discovery">
                <option>Discovery</option>
                <option>Qualification</option>
                <option>Technical</option>
                <option>Commercial</option>
                <option>Other</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">When</span>
              <input name="scheduledAt" type="datetime-local" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Participants</span>
              <input name="participants" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Notes</span>
              <textarea name="notes" rows={2} className={field} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Schedule meeting
              </button>
            </div>
          </form>
        )}

        {tab === "demo" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void call("/api/demos", {
                leadId: props.leadId,
                scheduledAt: fd.get("scheduledAt") || undefined,
                participants: fd.get("participants"),
                nextAction: fd.get("nextAction"),
              });
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">When</span>
              <input name="scheduledAt" type="datetime-local" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Next action</span>
              <input name="nextAction" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Participants</span>
              <input name="participants" className={field} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Schedule demo
              </button>
            </div>
          </form>
        )}

        {tab === "requirement" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void call("/api/requirements", {
                leadId: props.leadId,
                requirementType: fd.get("requirementType"),
                description: fd.get("description"),
                businessRequirement: fd.get("businessRequirement"),
                technicalRequirement: fd.get("technicalRequirement"),
                scope: fd.get("scope"),
                timeline: fd.get("timeline"),
                budget: fd.get("budget"),
                decisionMaker: fd.get("decisionMaker"),
              });
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Type</span>
              <input name="requirementType" className={field} placeholder="Functional / Security / …" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Decision maker</span>
              <input name="decisionMaker" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Description</span>
              <textarea name="description" rows={2} className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Business need</span>
              <input name="businessRequirement" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Technical</span>
              <input name="technicalRequirement" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Scope</span>
              <input name="scope" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Timeline</span>
              <input name="timeline" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Budget</span>
              <input name="budget" className={field} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Capture requirement
              </button>
            </div>
          </form>
        )}

        {tab === "request" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void call("/api/client-requests", {
                leadId: props.leadId,
                requestType: fd.get("requestType"),
                title: fd.get("title"),
                notes: fd.get("notes"),
                createFollowUp: fd.get("createFollowUp") === "on",
              });
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Request type</span>
              <select name="requestType" className={field} defaultValue="proposal">
                {REQUEST_TYPES.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Title</span>
              <input name="title" className={field} placeholder="Send proposal" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Notes</span>
              <textarea name="notes" rows={2} className={field} />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input name="createFollowUp" type="checkbox" defaultChecked />
              Auto-create follow-up (+3 days)
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Log client request
              </button>
            </div>
          </form>
        )}

        {tab === "opportunity" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void call("/api/opportunities", {
                leadId: props.leadId,
                opportunityValue: fd.get("opportunityValue")
                  ? Number(fd.get("opportunityValue"))
                  : undefined,
                probability: fd.get("probability")
                  ? Number(fd.get("probability"))
                  : undefined,
                expectedClosureDate: fd.get("expectedClosureDate") || undefined,
                negotiationStatus: fd.get("negotiationStatus"),
                nextAction: fd.get("nextAction"),
                notes: fd.get("notes"),
              });
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Value</span>
              <input name="opportunityValue" type="number" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Probability %</span>
              <input name="probability" type="number" min={0} max={100} className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Expected close</span>
              <input name="expectedClosureDate" type="date" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Negotiation status</span>
              <input name="negotiationStatus" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Next action</span>
              <input name="nextAction" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Notes</span>
              <textarea name="notes" rows={2} className={field} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Create opportunity
              </button>
            </div>
          </form>
        )}

        {tab === "stage" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void call(
                `/api/leads/${props.leadId}`,
                {
                  action: "set_stage",
                  salesStage: fd.get("salesStage"),
                  wonValue: fd.get("wonValue") ? Number(fd.get("wonValue")) : undefined,
                  lostReason: fd.get("lostReason"),
                  competitor: fd.get("competitor"),
                  notes: fd.get("notes"),
                },
                "PATCH",
              );
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Sales stage</span>
              <select name="salesStage" className={field} defaultValue={props.salesStage}>
                {SALES_STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Won value (if Won)</span>
              <input name="wonValue" type="number" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Lost reason</span>
              <input name="lostReason" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Competitor</span>
              <input name="competitor" className={field} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Notes</span>
              <textarea name="notes" rows={2} className={field} />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Update stage
              </button>
            </div>
          </form>
        )}

        {err ? <p className="mt-3 text-sm text-rose-700">{err}</p> : null}
        {msg ? <p className="mt-3 text-sm text-emerald-700">{msg}</p> : null}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Follow-ups">
          <HistoryList
            empty="None yet"
            items={props.followUps.map((f) => ({
              id: f.id,
              title: `FU #${f.followUpNumber}`,
              meta: `${f.status}${f.dueAt ? ` · ${new Date(f.dueAt).toLocaleString()}` : ""}`,
              action:
                f.status === "Pending" ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--accent)]"
                    onClick={() =>
                      void call("/api/followups", { id: f.id, status: "Completed" }, "PATCH")
                    }
                  >
                    Complete
                  </button>
                ) : null,
            }))}
          />
        </Panel>
        <Panel title="Meetings">
          <HistoryList
            empty="None yet"
            items={props.meetings.map((m) => ({
              id: m.id,
              title: m.meetingType ?? "Meeting",
              meta: `${m.status}${m.scheduledAt ? ` · ${new Date(m.scheduledAt).toLocaleString()}` : ""}`,
              action:
                m.status !== "Completed" ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--accent)]"
                    onClick={() =>
                      void call("/api/meetings", { id: m.id, status: "Completed" }, "PATCH")
                    }
                  >
                    Complete
                  </button>
                ) : null,
            }))}
          />
        </Panel>
        <Panel title="Demos">
          <HistoryList
            empty="None yet"
            items={props.demos.map((d) => ({
              id: d.id,
              title: d.status,
              meta: d.scheduledAt ? new Date(d.scheduledAt).toLocaleString() : "—",
            }))}
          />
        </Panel>
        <Panel title="Requirements">
          <HistoryList
            empty="None yet"
            items={props.requirements.map((r) => ({
              id: r.id,
              title: r.requirementType ?? "Requirement",
              meta: r.description ?? r.status,
            }))}
          />
        </Panel>
        <Panel title="Client requests" className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            {props.clientRequests.length === 0 ? (
              <li className="text-[var(--muted)]">None yet</li>
            ) : (
              props.clientRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {r.title}{" "}
                      <Badge tone={r.status === "Sent" ? "ok" : "warn"}>{r.status}</Badge>
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {r.requestType}
                      {r.resource ? ` · ${r.resource.title}` : " · no SharePoint map"}
                    </p>
                    {r.resource ? (
                      <a
                        href={r.resource.sharePointUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--accent)]"
                      >
                        Open SharePoint
                      </a>
                    ) : null}
                  </div>
                  {r.status !== "Sent" && r.status !== "Completed" ? (
                    <button
                      type="button"
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                      onClick={() =>
                        void call(
                          "/api/client-requests",
                          { id: r.id, action: "mark_sent" },
                          "PATCH",
                        )
                      }
                    >
                      Mark sent
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </Panel>
        <Panel title="Opportunities">
          <HistoryList
            empty="None yet"
            items={props.opportunities.map((o) => ({
              id: o.id,
              title: o.salesStage,
              meta: [
                o.opportunityValue != null ? `₹${o.opportunityValue}` : null,
                o.probability != null ? `${o.probability}%` : null,
                o.negotiationStatus,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
        </Panel>
        <Panel title="Activity timeline">
          <HistoryList
            empty="No activity yet"
            items={props.activities.map((a) => ({
              id: a.id,
              title: `${a.activityType}: ${a.title}`,
              meta: new Date(a.occurredAt).toLocaleString(),
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}

function HistoryList({
  items,
  empty,
}: {
  empty: string;
  items: {
    id: string;
    title: string;
    meta?: string;
    action?: React.ReactNode;
  }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{item.title}</p>
            {item.meta ? (
              <p className="text-xs text-[var(--muted)]">{item.meta}</p>
            ) : null}
          </div>
          {item.action}
        </li>
      ))}
    </ul>
  );
}
