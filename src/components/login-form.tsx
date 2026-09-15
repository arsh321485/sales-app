"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
          Pipeline OS
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use your work email and password. You only see your own leads and tasks.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-[var(--border)] bg-white/90 p-5 shadow-sm"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            placeholder="you@company.com"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] px-3 py-2"
            placeholder="••••••••"
          />
        </label>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-[var(--accent)] px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
