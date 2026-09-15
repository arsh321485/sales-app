"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Panel } from "@/components/ui";

type Person = { id: string; name: string; role: string };

export function LeadEditPanel({
  leadId,
  orgName,
  city,
  state,
  industry,
  nextAction,
  nextActionDate,
  icpFit,
  triggerEvent,
  people,
  isManager,
  currentOwnerId,
}: {
  leadId: string;
  orgName: string;
  city: string | null;
  state: string | null;
  industry: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  icpFit: string | null;
  triggerEvent: string | null;
  people: Person[];
  isManager: boolean;
  currentOwnerId: string | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field =
    "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error ?? "Failed");
      return false;
    }
    setMsg("Saved");
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-4">
      <Panel title="Edit lead details">
        <form
          className="grid gap-2 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await save({
              action: "edit_details",
              orgName: fd.get("orgName"),
              city: fd.get("city"),
              state: fd.get("state"),
              industry: fd.get("industry"),
              nextAction: fd.get("nextAction"),
              nextActionDate: fd.get("nextActionDate") || null,
              icpFit: fd.get("icpFit"),
              triggerEvent: fd.get("triggerEvent"),
            });
          }}
        >
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-[var(--muted)]">Company</span>
            <input name="orgName" defaultValue={orgName} required className={field} />
          </label>
          <input name="city" defaultValue={city ?? ""} placeholder="City" className={field} />
          <input name="state" defaultValue={state ?? ""} placeholder="State" className={field} />
          <input
            name="industry"
            defaultValue={industry ?? ""}
            placeholder="Industry"
            className={field}
          />
          <select name="icpFit" className={field} defaultValue={icpFit ?? ""}>
            <option value="">ICP fit</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <input
            name="triggerEvent"
            defaultValue={triggerEvent ?? ""}
            placeholder="Trigger"
            className={`${field} sm:col-span-2`}
          />
          <input
            name="nextAction"
            defaultValue={nextAction ?? ""}
            placeholder="Next action"
            className={`${field} sm:col-span-2`}
          />
          <input
            name="nextActionDate"
            type="date"
            defaultValue={
              nextActionDate ? nextActionDate.slice(0, 10) : ""
            }
            className={`${field} sm:col-span-2`}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white sm:col-span-2"
          >
            Save changes
          </button>
        </form>
      </Panel>

      {isManager ? (
        <Panel title="Reassign owner">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await save({
                action: "assign_owner",
                ownerId: fd.get("ownerId"),
              });
            }}
          >
            <select
              name="ownerId"
              className={`${field} max-w-xs`}
              defaultValue={currentOwnerId ?? ""}
            >
              <option value="">Unassigned</option>
              {people.map((p) => (
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
              Reassign
            </button>
          </form>
        </Panel>
      ) : null}

      <Panel title="Delete lead">
        <p className="mb-2 text-xs text-[var(--muted)]">
          Soft-delete hides the lead from queues. Prefer Drop with a reason when the
          deal ended.
        </p>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          onClick={async () => {
            if (!confirm("Soft-delete this lead?")) return;
            const ok = await save({ action: "soft_delete" });
            if (ok) router.push("/leads");
          }}
        >
          Delete lead
        </button>
      </Panel>

      {msg ? <p className="text-sm text-[var(--accent-ink)]">{msg}</p> : null}
    </div>
  );
}
