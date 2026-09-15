"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Panel } from "@/components/ui";

type Team = { id: string; name: string; code: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId?: string | null;
  teamName: string | null;
  isActive: boolean;
};

const ROLES = [
  "Research",
  "Outreach",
  "BDM",
  "Presales",
  "Delivery",
  "Head",
  "Admin",
];

export function AdminUsersPanel({
  teams,
  initialUsers,
  currentUserId,
}: {
  teams: Team[];
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const field =
    "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

  function refreshMessage(msg: string) {
    setOk(msg);
    setError(null);
    router.refresh();
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
        teamId: fd.get("teamId") || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    refreshMessage(`Created ${data.email}`);
    setUsers((prev) => [
      {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        teamId: (fd.get("teamId") as string) || null,
        teamName: teams.find((t) => t.id === fd.get("teamId"))?.name ?? null,
        isActive: true,
      },
      ...prev,
    ]);
    e.currentTarget.reset();
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: fd.get("name"),
      email: fd.get("email"),
      role: fd.get("role"),
      teamId: fd.get("teamId") || null,
      isActive: fd.get("isActive") === "true",
    };
    const password = String(fd.get("password") ?? "");
    if (password) payload.password = password;

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Update failed");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
    setEditingId(null);
    refreshMessage(`Updated ${data.email}`);
  }

  async function onDeactivate(id: string, isActive: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !isActive } : u)),
    );
    refreshMessage(isActive ? "User deactivated" : "User reactivated");
  }

  async function onDelete(id: string, name: string) {
    if (
      !confirm(
        `Delete ${name}? This cannot be undone. Prefer Deactivate if they have history.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Delete failed");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    refreshMessage(`Deleted ${name}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Create employee (email + password)">
        <form onSubmit={onCreate} className="space-y-2">
          <input name="name" required placeholder="Full name" className={field} />
          <input
            name="email"
            type="email"
            required
            placeholder="email@company.com"
            className={field}
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Temp password (min 8 chars)"
            className={field}
          />
          <select name="role" className={field} defaultValue="Outreach">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select name="teamId" className={field} defaultValue="">
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Create user"}
          </button>
        </form>
      </Panel>

      <Panel title={`Users (${users.length})`}>
        {error ? <p className="mb-2 text-sm text-rose-700">{error}</p> : null}
        {ok ? <p className="mb-2 text-sm text-[var(--accent-ink)]">{ok}</p> : null}
        <ul className="max-h-[480px] space-y-3 overflow-y-auto text-sm">
          {users.map((u) => (
            <li
              key={u.id}
              className="rounded-lg border border-[var(--border)] px-3 py-2"
            >
              {editingId === u.id ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => onUpdate(e, u.id)}
                >
                  <input
                    name="name"
                    defaultValue={u.name}
                    required
                    className={field}
                  />
                  <input
                    name="email"
                    type="email"
                    defaultValue={u.email}
                    required
                    className={field}
                  />
                  <select name="role" className={field} defaultValue={u.role}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    name="teamId"
                    className={field}
                    defaultValue={u.teamId ?? ""}
                  >
                    <option value="">No team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="isActive"
                    className={field}
                    defaultValue={u.isActive ? "true" : "false"}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    placeholder="New password (optional)"
                    className={field}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {u.name}
                      {!u.isActive ? (
                        <span className="ml-2 text-xs text-rose-700">(inactive)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{u.email}</p>
                    <div className="mt-1">
                      <Badge>
                        {u.role}
                        {u.teamName ? ` · ${u.teamName}` : ""}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingId(u.id)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy || u.id === currentUserId}
                      onClick={() => onDeactivate(u.id, u.isActive)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || u.id === currentUserId}
                      onClick={() => onDelete(u.id, u.name)}
                      className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
