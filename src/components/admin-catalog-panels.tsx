"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Panel } from "@/components/ui";

const field =
  "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

export function AdminCatalogPanels({
  teams: initialTeams,
  products: initialProducts,
  masters: initialMasters,
}: {
  teams: { id: string; name: string; code: string }[];
  products: { id: string; name: string; code: string; isActive: boolean }[];
  masters: {
    id: string;
    category: string;
    code: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
  }[];
}) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [products, setProducts] = useState(initialProducts);
  const [masters, setMasters] = useState(initialMasters);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function api(
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? "Failed");
      return null;
    }
    router.refresh();
    return data;
  }

  return (
    <div className="space-y-4">
      {err ? <p className="text-sm text-rose-700">{err}</p> : null}
      {msg ? <p className="text-sm text-[var(--accent-ink)]">{msg}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Teams (${teams.length})`}>
          <form
            className="mb-3 flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = await api("/api/admin/teams", "POST", {
                name: fd.get("name"),
                code: fd.get("code"),
              });
              if (data) {
                setTeams((t) => [...t, data].sort((a, b) => a.name.localeCompare(b.name)));
                setMsg("Team created");
                e.currentTarget.reset();
              }
            }}
          >
            <input name="name" required placeholder="Team name" className={`${field} max-w-[140px]`} />
            <input name="code" required placeholder="CODE" className={`${field} max-w-[90px]`} />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs text-white"
            >
              Add
            </button>
          </form>
          <ul className="space-y-2 text-sm">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span>
                  {t.name}{" "}
                  <span className="text-[var(--muted)]">({t.code})</span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs text-rose-700"
                  onClick={async () => {
                    if (!confirm(`Delete team ${t.name}?`)) return;
                    const data = await api(`/api/admin/teams?id=${t.id}`, "DELETE");
                    if (data) {
                      setTeams((list) => list.filter((x) => x.id !== t.id));
                      setMsg("Team deleted");
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={`Products (${products.length})`}>
          <form
            className="mb-3 flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = await api("/api/admin/products", "POST", {
                name: fd.get("name"),
                code: fd.get("code"),
              });
              if (data) {
                setProducts((p) =>
                  [...p, data].sort((a, b) => a.name.localeCompare(b.name)),
                );
                setMsg("Product created");
                e.currentTarget.reset();
              }
            }}
          >
            <input name="name" required placeholder="Product name" className={`${field} max-w-[140px]`} />
            <input name="code" required placeholder="CODE" className={`${field} max-w-[90px]`} />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs text-white"
            >
              Add
            </button>
          </form>
          <ul className="space-y-2 text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Badge tone={p.isActive ? "accent" : "neutral"}>{p.name}</Badge>
                  <span className="text-xs text-[var(--muted)]">{p.code}</span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs"
                    onClick={async () => {
                      const data = await api("/api/admin/products", "PATCH", {
                        id: p.id,
                        isActive: !p.isActive,
                      });
                      if (data) {
                        setProducts((list) =>
                          list.map((x) =>
                            x.id === p.id ? { ...x, isActive: !p.isActive } : x,
                          ),
                        );
                        setMsg(p.isActive ? "Product deactivated" : "Product activated");
                      }
                    }}
                  >
                    {p.isActive ? "Off" : "On"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs text-rose-700"
                    onClick={async () => {
                      if (!confirm(`Delete product ${p.name}?`)) return;
                      const data = await api(
                        `/api/admin/products?id=${p.id}`,
                        "DELETE",
                      );
                      if (data) {
                        setProducts((list) => list.filter((x) => x.id !== p.id));
                        setMsg("Product deleted");
                      }
                    }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={`Masters / dropdowns (${masters.length})`} className="lg:col-span-2">
          <form
            className="mb-3 grid gap-2 sm:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = await api("/api/admin/masters", "POST", {
                category: fd.get("category"),
                code: fd.get("code"),
                label: fd.get("label"),
                sortOrder: fd.get("sortOrder"),
              });
              if (data) {
                setMasters((m) => [...m, data]);
                setMsg("Master value created");
                e.currentTarget.reset();
              }
            }}
          >
            <input name="category" required placeholder="category e.g. industry" className={field} />
            <input name="code" required placeholder="code e.g. retail" className={field} />
            <input name="label" required placeholder="Label" className={field} />
            <div className="flex gap-2">
              <input name="sortOrder" type="number" defaultValue={0} className={field} />
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs text-white"
              >
                Add
              </button>
            </div>
          </form>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {masters.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span>
                  {m.label}
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {m.category} · {m.code}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs text-rose-700"
                  onClick={async () => {
                    if (!confirm(`Delete ${m.label}?`)) return;
                    const data = await api(`/api/admin/masters?id=${m.id}`, "DELETE");
                    if (data) {
                      setMasters((list) => list.filter((x) => x.id !== m.id));
                      setMsg("Master deleted");
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
