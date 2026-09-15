"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel } from "@/components/ui";

type Person = { id: string; name: string; role: string };

export function LeadActions({
  leadId,
  currentPhase,
  people,
}: {
  leadId: string;
  currentPhase: number;
  people: Person[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(
    url: string,
    body: Record<string, unknown>,
    method: "POST" | "PATCH" = "POST",
  ) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "Action failed");
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  const field =
    "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";
  const outreach = people.filter((p) => p.role === "Outreach");
  const bdms = people.filter((p) => p.role === "BDM" || p.role === "Head");
  const demos = people.filter((p) => p.role === "Presales" || p.role === "BDM");

  return (
    <div className="space-y-4">
      {currentPhase === 1 ? (
        <Panel title="Qualify & hand off to outreach">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(`/api/leads/${leadId}`, {
                action: "qualify",
                outreachOwnerId: fd.get("outreachOwnerId"),
              }, "PATCH");
            }}
          >
            <select name="outreachOwnerId" required className={field} defaultValue="">
              <option value="" disabled>
                Select outreach owner
              </option>
              {(outreach.length ? outreach : people).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
            >
              Mark Qualified → Phase 2
            </button>
          </form>
        </Panel>
      ) : null}

      {[2, 3].includes(currentPhase) ? (
        <>
          <Panel title="Log outreach attempt">
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                run(`/api/leads/${leadId}/outreach`, {
                  channel: fd.get("channel"),
                  responseType: fd.get("responseType"),
                  notes: fd.get("notes"),
                });
              }}
            >
              <select name="channel" className={field} defaultValue="Call">
                <option>Call</option>
                <option>Email</option>
                <option>LinkedIn</option>
                <option>WhatsApp</option>
              </select>
              <select name="responseType" className={field} defaultValue="No Response">
                <option>No Response</option>
                <option>Connected</option>
                <option>Interested</option>
                <option>Not Interested</option>
                <option>Wrong Contact</option>
              </select>
              <input
                name="notes"
                className={`${field} sm:col-span-2`}
                placeholder="Notes"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white sm:col-span-2"
              >
                Save attempt
              </button>
            </form>
          </Panel>

          <Panel title="Meeting agreed → hand to BDM">
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                run(`/api/leads/${leadId}`, {
                  action: "meeting_agreed",
                  bdmId: fd.get("bdmId"),
                }, "PATCH");
              }}
            >
              <select name="bdmId" required className={field} defaultValue="">
                <option value="" disabled>
                  Select BDM
                </option>
                {(bdms.length ? bdms : people).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
              >
                Move to Meeting phase
              </button>
            </form>
          </Panel>
        </>
      ) : null}

      {currentPhase === 4 ? (
        <Panel title="Schedule meeting">
          <form
            className="grid gap-2 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run("/api/meetings", {
                leadId,
                meetingType: fd.get("meetingType"),
                mode: fd.get("mode"),
                scheduledAt: fd.get("scheduledAt"),
                meetingLink: fd.get("meetingLink"),
                attendees: fd.get("attendees"),
              });
            }}
          >
            <select name="meetingType" className={field} defaultValue="Discovery">
              <option>Discovery</option>
              <option>Technical</option>
              <option>Demo Pitch</option>
            </select>
            <select name="mode" className={field} defaultValue="Online">
              <option>Online</option>
              <option>In-person</option>
              <option>Hybrid</option>
            </select>
            <input
              name="scheduledAt"
              type="datetime-local"
              required
              className={`${field} sm:col-span-2`}
            />
            <input
              name="meetingLink"
              className={`${field} sm:col-span-2`}
              placeholder="Meeting link"
            />
            <input
              name="attendees"
              className={`${field} sm:col-span-2`}
              placeholder="Attendees"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white sm:col-span-2"
            >
              Book on calendar
            </button>
          </form>
        </Panel>
      ) : null}

      {[5, 6, 7].includes(currentPhase) || currentPhase >= 5 ? (
        <Panel title="Schedule / assign demo">
          <form
            className="grid gap-2 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run("/api/demos", {
                leadId,
                demoType: fd.get("demoType"),
                scheduledAt: fd.get("scheduledAt"),
                prepOwnerId: fd.get("prepOwnerId"),
                clientConfirmed: fd.get("clientConfirmed") === "on",
              });
            }}
          >
            <select name="demoType" className={field} defaultValue="Standard">
              <option>Standard</option>
              <option>Customised</option>
              <option>Technical Deep-dive</option>
              <option>POC</option>
            </select>
            <select name="prepOwnerId" className={field} defaultValue="">
              <option value="" disabled>
                Demo owner
              </option>
              {(demos.length ? demos : people).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
            <input
              name="scheduledAt"
              type="datetime-local"
              className={`${field} sm:col-span-2`}
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input name="clientConfirmed" type="checkbox" defaultChecked />
              Client confirmed demo date
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white sm:col-span-2"
            >
              Save demo
            </button>
          </form>
        </Panel>
      ) : null}

      <Panel title="Drop lead">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(`/api/leads/${leadId}`, {
              action: "drop",
              dropReason: fd.get("dropReason"),
            }, "PATCH");
          }}
        >
          <input
            name="dropReason"
            required
            className={`${field} max-w-xs`}
            placeholder="Drop reason"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            Drop
          </button>
        </form>
      </Panel>

      {msg ? <p className="text-sm text-[var(--accent-ink)]">{msg}</p> : null}
    </div>
  );
}
