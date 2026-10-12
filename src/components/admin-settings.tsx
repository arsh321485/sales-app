"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, RESOURCE_TYPES } from "@/lib/constants";
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
type ProductRow = {
  id: string;
  name: string;
  code: string;
  prefix: string;
  nextNumber: number;
  isActive: boolean;
};
type ResourceRow = {
  id: string;
  title: string;
  resourceType: string;
  sharePointUrl: string;
  productId: string;
  productName: string;
  isActive: boolean;
};

const field =
  "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

export function AdminSettings({
  currentUserId,
  teams: initialTeams,
  initialUsers,
  initialProducts,
  initialResources,
}: {
  currentUserId: string;
  teams: Team[];
  initialUsers: UserRow[];
  initialProducts: ProductRow[];
  initialResources: ResourceRow[];
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [users, setUsers] = useState(initialUsers);
  const [products, setProducts] = useState(initialProducts);
  const [resources, setResources] = useState(initialResources);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  function flash(msg: string) {
    setOk(msg);
    setError(null);
    router.refresh();
  }

  async function api(
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return null;
    }
    return data;
  }

  // ——— Users ———
  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await api("/api/admin/users", "POST", {
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      role: fd.get("role"),
      teamId: fd.get("teamId") || null,
    });
    if (!data) return;
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
    flash(`Created ${data.email}`);
    e.currentTarget.reset();
  }

  async function saveUser(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
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
    const data = await api(`/api/admin/users/${id}`, "PATCH", payload);
    if (!data) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              name: data.name,
              email: data.email,
              role: data.role,
              teamId: data.teamId,
              teamName: data.teamName,
              isActive: data.isActive,
            }
          : u,
      ),
    );
    setEditingUserId(null);
    flash("User updated");
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user? Open leads must be reassigned first.")) return;
    const data = await api(`/api/admin/users/${id}`, "DELETE");
    if (!data) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    flash("User deleted");
  }

  // ——— Products ———
  async function createProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await api("/api/admin/products", "POST", {
      name: fd.get("name"),
      code: fd.get("code"),
      prefix: fd.get("prefix") || fd.get("code"),
    });
    if (!data) return;
    setProducts((prev) => [data, ...prev]);
    flash(`Product ${data.code} created`);
    e.currentTarget.reset();
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await api("/api/admin/products", "PATCH", {
      id,
      name: fd.get("name"),
      prefix: fd.get("prefix"),
      isActive: fd.get("isActive") === "true",
    });
    if (!data) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    setEditingProductId(null);
    flash("Product updated");
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? Only allowed if it has no leads.")) return;
    const data = await api(`/api/admin/products?id=${id}`, "DELETE");
    if (!data) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    flash("Product deleted");
  }

  async function seedDefaultProducts() {
    const data = await api("/api/admin/users", "PUT");
    if (!data) return;
    flash(data.message ?? `Created ${data.created} products`);
    router.refresh();
  }

  // ——— Teams ———
  async function createTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await api("/api/admin/teams", "POST", {
      name: fd.get("name"),
      code: fd.get("code"),
    });
    if (!data) return;
    setTeams((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    flash(`Team ${data.name} created`);
    e.currentTarget.reset();
  }

  async function saveTeam(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await api("/api/admin/teams", "PATCH", {
      id,
      name: fd.get("name"),
      code: fd.get("code"),
    });
    if (!data) return;
    setTeams((prev) => prev.map((t) => (t.id === id ? data : t)));
    setUsers((prev) =>
      prev.map((u) =>
        u.teamId === id ? { ...u, teamName: data.name } : u,
      ),
    );
    setEditingTeamId(null);
    flash("Team updated");
  }

  async function deleteTeam(id: string) {
    if (!confirm("Delete this team? Move users off the team first.")) return;
    const data = await api(`/api/admin/teams?id=${id}`, "DELETE");
    if (!data) return;
    setTeams((prev) => prev.filter((t) => t.id !== id));
    flash("Team deleted");
  }

  // ——— Resources ———
  async function createResource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = await api("/api/admin/resources", "POST", {
      productId: fd.get("productId"),
      resourceType: fd.get("resourceType"),
      title: fd.get("title"),
      sharePointUrl: fd.get("sharePointUrl"),
    });
    if (!data) return;
    const productName =
      products.find((p) => p.id === fd.get("productId"))?.name ?? "";
    setResources((prev) => [
      {
        id: data.id,
        title: data.title,
        resourceType: data.resourceType,
        sharePointUrl: data.sharePointUrl,
        productId: data.productId,
        productName,
        isActive: true,
      },
      ...prev,
    ]);
    flash("SharePoint resource linked");
    e.currentTarget.reset();
  }

  async function saveResource(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const productId = String(fd.get("productId"));
    const data = await api("/api/admin/resources", "PATCH", {
      id,
      productId,
      resourceType: fd.get("resourceType"),
      title: fd.get("title"),
      sharePointUrl: fd.get("sharePointUrl"),
      isActive: fd.get("isActive") === "true",
    });
    if (!data) return;
    setResources((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              id: data.id,
              title: data.title,
              resourceType: data.resourceType,
              sharePointUrl: data.sharePointUrl,
              productId: data.productId,
              productName: data.product?.name ?? products.find((p) => p.id === productId)?.name ?? "",
              isActive: data.isActive,
            }
          : r,
      ),
    );
    setEditingResourceId(null);
    flash("Resource updated");
  }

  async function deleteResource(id: string) {
    if (!confirm("Delete this SharePoint resource link?")) return;
    const data = await api(`/api/admin/resources?id=${id}`, "DELETE");
    if (!data) return;
    setResources((prev) => prev.filter((r) => r.id !== id));
    flash("Resource deleted");
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

      {/* USERS */}
      <Panel title="Users — Create / Edit / Deactivate / Delete">
        <form onSubmit={createUser} className="mb-4 grid gap-3 sm:grid-cols-3">
          <input name="name" required placeholder="Name" className={field} />
          <input name="email" required type="email" placeholder="Email" className={field} />
          <input
            name="password"
            required
            type="password"
            minLength={8}
            placeholder="Password (min 8)"
            className={field}
          />
          <select name="role" className={field} defaultValue="SalesMember">
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
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
            Add user
          </button>
        </form>

        <ul className="divide-y divide-[var(--border)] text-sm">
          {users.map((u) => (
            <li key={u.id} className="py-3">
              {editingUserId === u.id ? (
                <form
                  onSubmit={(e) => void saveUser(e, u.id)}
                  className="grid gap-2 sm:grid-cols-3"
                >
                  <input name="name" defaultValue={u.name} required className={field} />
                  <input
                    name="email"
                    type="email"
                    defaultValue={u.email}
                    required
                    className={field}
                  />
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    placeholder="New password (optional)"
                    className={field}
                  />
                  <select name="role" defaultValue={u.role} className={field}>
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <select name="teamId" defaultValue={u.teamId ?? ""} className={field}>
                    <option value="">No team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="isActive"
                    defaultValue={u.isActive ? "true" : "false"}
                    className={field}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <div className="flex gap-2 sm:col-span-3">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[var(--muted)]"
                      onClick={() => setEditingUserId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {u.name}{" "}
                      {!u.isActive ? <Badge tone="danger">Inactive</Badge> : null}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {u.email} · {u.role}
                      {u.teamName ? ` · ${u.teamName}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--accent)]"
                      onClick={() => setEditingUserId(u.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-rose-700"
                      onClick={() => void deleteUser(u.id)}
                      disabled={u.id === currentUserId}
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

      {/* PRODUCTS */}
      <Panel
        title="Products — Create / Edit / Deactivate / Delete"
        action={
          products.length === 0 ? (
            <button
              type="button"
              onClick={() => void seedDefaultProducts()}
              className="text-xs text-[var(--accent)]"
              disabled={busy}
            >
              Add default 5 products
            </button>
          ) : null
        }
      >
        <form onSubmit={createProduct} className="mb-4 grid gap-3 sm:grid-cols-4">
          <input name="name" required placeholder="VaptFix" className={field} />
          <input name="code" required placeholder="VF" className={field} />
          <input name="prefix" placeholder="Prefix (default=code)" className={field} />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Add product
          </button>
        </form>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {products.map((p) => (
            <li key={p.id} className="py-3">
              {editingProductId === p.id ? (
                <form
                  onSubmit={(e) => void saveProduct(e, p.id)}
                  className="grid gap-2 sm:grid-cols-3"
                >
                  <input name="name" defaultValue={p.name} required className={field} />
                  <input name="prefix" defaultValue={p.prefix} required className={field} />
                  <select
                    name="isActive"
                    defaultValue={p.isActive ? "true" : "false"}
                    className={field}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <p className="text-xs text-[var(--muted)] sm:col-span-3">
                    Code {p.code} is fixed. Next Lead ID: {p.prefix}
                    {String(p.nextNumber).padStart(3, "0")}
                  </p>
                  <div className="flex gap-2 sm:col-span-3">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[var(--muted)]"
                      onClick={() => setEditingProductId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {p.name} ({p.code}) — next Lead ID {p.prefix}
                    {String(p.nextNumber).padStart(3, "0")}{" "}
                    <Badge tone={p.isActive ? "ok" : "danger"}>
                      {p.isActive ? "Active" : "Off"}
                    </Badge>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--accent)]"
                      onClick={() => setEditingProductId(p.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-rose-700"
                      onClick={() => void deleteProduct(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {products.length === 0 ? (
            <li className="text-[var(--muted)]">No products yet.</li>
          ) : null}
        </ul>
      </Panel>

      {/* RESOURCES */}
      <Panel title="SharePoint resources — Create / Edit / Delete">
        <form onSubmit={createResource} className="mb-4 grid gap-3 sm:grid-cols-2">
          <select name="productId" required className={field} defaultValue="">
            <option value="" disabled>
              Product
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select name="resourceType" className={field} defaultValue="Proposal">
            {RESOURCE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input name="title" required placeholder="Title" className={field} />
          <input
            name="sharePointUrl"
            required
            placeholder="https://…sharepoint.com/…"
            className={field}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60 sm:col-span-2"
          >
            Link resource
          </button>
        </form>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {resources.map((r) => (
            <li key={r.id} className="py-3">
              {editingResourceId === r.id ? (
                <form
                  onSubmit={(e) => void saveResource(e, r.id)}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <select name="productId" defaultValue={r.productId} className={field}>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select name="resourceType" defaultValue={r.resourceType} className={field}>
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <input name="title" defaultValue={r.title} required className={field} />
                  <input
                    name="sharePointUrl"
                    defaultValue={r.sharePointUrl}
                    required
                    className={field}
                  />
                  <select
                    name="isActive"
                    defaultValue={r.isActive ? "true" : "false"}
                    className={field}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[var(--muted)]"
                      onClick={() => setEditingResourceId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <a
                      href={r.sharePointUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[var(--accent)]"
                    >
                      {r.title}
                    </a>
                    <p className="text-xs text-[var(--muted)]">
                      {r.productName} · {r.resourceType}
                      {!r.isActive ? " · Off" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--accent)]"
                      onClick={() => setEditingResourceId(r.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-rose-700"
                      onClick={() => void deleteResource(r.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {resources.length === 0 ? (
            <li className="text-[var(--muted)]">No SharePoint links yet.</li>
          ) : null}
        </ul>
      </Panel>

      {/* TEAMS */}
      <Panel title="Teams — Create / Edit / Delete">
        <form onSubmit={createTeam} className="mb-4 grid gap-3 sm:grid-cols-3">
          <input name="name" required placeholder="Team name" className={field} />
          <input name="code" required placeholder="Code" className={field} />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Add team
          </button>
        </form>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {teams.map((t) => (
            <li key={t.id} className="py-3">
              {editingTeamId === t.id ? (
                <form
                  onSubmit={(e) => void saveTeam(e, t.id)}
                  className="grid gap-2 sm:grid-cols-3"
                >
                  <input name="name" defaultValue={t.name} required className={field} />
                  <input name="code" defaultValue={t.code} required className={field} />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="text-xs text-[var(--muted)]"
                      onClick={() => setEditingTeamId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {t.name} ({t.code})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--accent)]"
                      onClick={() => setEditingTeamId(t.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-rose-700"
                      onClick={() => void deleteTeam(t.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {teams.length === 0 ? (
            <li className="text-[var(--muted)]">No teams yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
