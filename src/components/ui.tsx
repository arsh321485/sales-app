import { cn } from "@/lib/constants";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3 shadow-[0_1px_0_rgba(20,40,60,0.04)] backdrop-blur">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700",
    ok: "bg-emerald-50 text-emerald-800",
    warn: "bg-amber-50 text-amber-900",
    danger: "bg-rose-50 text-rose-800",
    info: "bg-sky-50 text-sky-800",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  title,
  children,
  action,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--border)] bg-white/80 shadow-[0_1px_0_rgba(20,40,60,0.04)] backdrop-blur",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          {title ? (
            <h2 className="text-sm font-semibold text-[var(--ink)]">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
