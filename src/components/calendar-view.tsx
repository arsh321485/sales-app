"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { cn } from "@/lib/constants";

export type CalendarEvent = {
  id: string;
  kind: "meeting" | "demo";
  title: string;
  subtitle: string;
  startsAt: string;
  status: string;
  leadId: string;
  code: string;
  mode?: string | null;
};

export function CalendarView({ events }: { events: CalendarEvent[] }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [filter, setFilter] = useState<"all" | "meeting" | "demo">("all");

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const filtered = useMemo(
    () => events.filter((e) => (filter === "all" ? true : e.kind === filter)),
    [events, filter],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of filtered) {
      const key = format(new Date(ev.startsAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const dayEvents = (byDay.get(selectedKey) ?? []).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const upcoming = [...filtered]
    .filter((e) => new Date(e.startsAt) >= addDays(new Date(), -1))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="All booked meetings and demos in one view — no separate spreadsheet or Outlook chase."
        actions={
          <div className="flex rounded-md border border-[var(--border)] bg-white p-0.5 text-sm">
            {(["all", "meeting", "demo"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded px-3 py-1.5 capitalize",
                  filter === f ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]",
                )}
              >
                {f === "all" ? "All" : f === "meeting" ? "Meetings" : "Demos"}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--meeting)]" /> Meeting
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--demo)]" /> Demo
        </span>
        <span className="text-[var(--muted)]">
          {filtered.length} event{filtered.length === 1 ? "" : "s"} in range
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="rounded border border-[var(--border)] px-2 py-1 text-sm"
              onClick={() => setCursor(subMonths(cursor, 1))}
            >
              ←
            </button>
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              {format(cursor, "MMMM yyyy")}
            </h2>
            <button
              type="button"
              className="rounded border border-[var(--border)] px-2 py-1 text-sm"
              onClick={() => setCursor(addMonths(cursor, 1))}
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const isSelected = isSameDay(day, selected);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={cn(
                    "min-h-[88px] rounded-lg border p-1.5 text-left transition",
                    inMonth ? "bg-white" : "bg-slate-50/80 text-slate-400",
                    isSelected
                      ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--border)] hover:border-slate-300",
                    isToday && !isSelected ? "bg-[var(--accent-soft)]/40" : "",
                  )}
                >
                  <div className="mb-1 text-xs font-semibold">{format(day, "d")}</div>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                        style={{
                          background:
                            ev.kind === "meeting" ? "var(--meeting)" : "var(--demo)",
                        }}
                        title={`${ev.title} · ${format(new Date(ev.startsAt), "h:mm a")}`}
                      >
                        {format(new Date(ev.startsAt), "HH:mm")} {ev.title}
                      </div>
                    ))}
                    {items.length > 3 ? (
                      <div className="text-[10px] text-[var(--muted)]">
                        +{items.length - 3} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title={format(selected, "EEEE, d MMM")}>
            {dayEvents.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No bookings this day.</p>
            ) : (
              <ul className="space-y-3">
                {dayEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-[var(--border)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={ev.kind === "meeting" ? "info" : "warn"}>
                        {ev.kind}
                      </Badge>
                      <span className="text-xs text-[var(--muted)]">
                        {format(new Date(ev.startsAt), "h:mm a")}
                      </span>
                    </div>
                    <Link
                      href={`/leads/${ev.leadId}`}
                      className="mt-1 block text-sm font-semibold hover:text-[var(--accent)]"
                    >
                      {ev.title}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {ev.code} · {ev.subtitle} · {ev.status}
                      {ev.mode ? ` · ${ev.mode}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Upcoming">
            <ul className="space-y-2">
              {upcoming.map((ev) => (
                <li key={ev.id} className="flex items-start gap-2 text-sm">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background:
                        ev.kind === "meeting" ? "var(--meeting)" : "var(--demo)",
                    }}
                  />
                  <div>
                    <Link
                      href={`/leads/${ev.leadId}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {ev.title}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {format(new Date(ev.startsAt), "dd MMM · h:mm a")} · {ev.kind}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
