"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  NEXT_ACTIONS,
  REQUEST_TYPES,
  SALES_STAGES,
  TEMPERATURES,
  defaultTeamsMeetingUrl,
  followUpLabel,
} from "@/lib/constants";
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
  teamsMeetingUrlDefault?: string;
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
  clientRequests: {
    id: string;
    title: string;
    requestType: string;
    status: string;
    resource: ResourceLite | null;
  }[];
  activities: {
    id: string;
    activityType: string;
    title: string;
    detail: string | null;
    occurredAt: string;
  }[];
};

type TabId = "qualify" | "followup" | "meeting" | "demo" | "request" | "stage";

export function LeadWorkspace(props: LeadWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("followup");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState(props.salesStage);

  const teamsDefault =
    props.teamsMeetingUrlDefault?.trim() || defaultTeamsMeetingUrl();

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
      return false;
    }
    setMsg("Saved");
    router.refresh();
    return true;
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "qualify", label: "Qualify" },
    { id: "followup", label: "Follow-up" },
    { id: "meeting", label: "Meeting" },
    { id: "demo", label: "Demo" },
    { id: "request", label: "Client request" },
    { id: "stage", label: "Stage / close" },
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
              const nextAction = String(fd.get("nextAction") ?? "");
              void call(
                `/api/leads/${props.leadId}`,
                {
                  action: "qualify",
                  temperature: fd.get("temperature"),
                  ownerId: fd.get("ownerId") || undefined,
                  nextAction,
                  nextFollowUpAt: fd.get("nextFollowUpAt") || undefined,
                },
                "PATCH",
              ).then((ok) => {
                if (!ok) return;
                if (nextAction === "to schedule a meeting") setTab("meeting");
                else if (nextAction === "demo") setTab("demo");
              });
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
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Next action</span>
              <select name="nextAction" className={field} defaultValue="follow-up">
                {NEXT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Next follow-up</span>
              <input name="nextFollowUpAt" type="datetime-local" className={field} />
            </label>
            <p className="text-xs text-[var(--muted)] sm:col-span-2">
              Pick &quot;to schedule a meeting&quot; or &quot;demo&quot; to jump straight to that tab — no
              follow-up required first.
            </p>
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
              <select name="nextAction" className={field} defaultValue="follow-up">
                {NEXT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
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
                teamsMeetingUrl: fd.get("teamsMeetingUrl"),
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
              <span className="mb-1 block text-[var(--muted)]">Microsoft Teams meeting link</span>
              <input
                name="teamsMeetingUrl"
                className={field}
                defaultValue={teamsDefault}
                placeholder="https://teams.microsoft.com/…"
              />
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
                teamsMeetingUrl: fd.get("teamsMeetingUrl"),
              });
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">When</span>
              <input name="scheduledAt" type="datetime-local" className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Next action</span>
              <select name="nextAction" className={field} defaultValue="follow-up">
                {NEXT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Microsoft Teams meeting link</span>
              <input
                name="teamsMeetingUrl"
                className={field}
                defaultValue={teamsDefault}
                placeholder="https://teams.microsoft.com/…"
              />
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

        {tab === "request" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const followUpRaw = String(fd.get("followUpAfterDays") ?? "").trim();
              void call("/api/client-requests", {
                leadId: props.leadId,
                requestType: fd.get("requestType"),
                title: fd.get("title"),
                description: fd.get("description"),
                notes: fd.get("notes"),
                sendDate: fd.get("sendDate"),
                followUpAfterDays: followUpRaw !== "" ? Number(followUpRaw) : undefined,
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
              <span className="mb-1 block text-[var(--muted)]">Description</span>
              <textarea name="description" rows={2} className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Sent / send-by date *</span>
              <input name="sendDate" type="date" required className={field} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">
                Follow-up after (days) if no response
              </span>
              <input
                name="followUpAfterDays"
                type="number"
                min={0}
                className={field}
                placeholder="Optional"
              />
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
                Log client request
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
              <select
                name="salesStage"
                className={field}
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
              >
                {SALES_STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {selectedStage === "Lost" ? (
              <>
                <label className="text-sm">
                  <span className="mb-1 block text-[var(--muted)]">Lost reason</span>
                  <input name="lostReason" className={field} />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-[var(--muted)]">Competitor</span>
                  <input name="competitor" className={field} />
                </label>
              </>
            ) : null}
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
              title: followUpLabel(f.followUpNumber),
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
        <Panel title="Client requests">
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
        <Panel title="Activity timeline" className="lg:col-span-2">
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
