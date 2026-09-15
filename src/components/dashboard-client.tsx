"use client";

import { useRouter } from "next/navigation";
import { PageHeader, Panel, StatCard, Badge } from "@/components/ui";

type Member = { id: string; name: string; role: string; teamName: string | null };

type Kpis = {
  activeOwned: number;
  wonOwned: number;
  droppedOwned: number;
  meetingsDone: number;
  meetingsUpcoming: number;
  demosDone: number;
  demosUpcoming: number;
  outreachAttempts: number;
  activities: number;
  winRate: number;
};

type PhaseBucket = { phase: number; label: string; name: string; count: number };

type CompareRow = {
  id: string;
  name: string;
  role: string;
  active: number;
  won: number;
  meetings: number;
  demos: number;
  touches: number;
};

function BarChart({
  items,
  valueKey,
  color = "var(--accent)",
}: {
  items: { label: string; value: number }[];
  valueKey?: string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[88px_1fr_36px] items-center gap-2 text-sm">
          <span className="truncate text-xs text-[var(--muted)]" title={item.label}>
            {item.label}
          </span>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: color,
                minWidth: item.value > 0 ? 4 : 0,
              }}
            />
          </div>
          <span className="text-right text-xs font-medium">{item.value}</span>
        </div>
      ))}
      {valueKey ? (
        <p className="pt-1 text-[11px] text-[var(--muted)]">{valueKey}</p>
      ) : null}
    </div>
  );
}

export function DashboardClient({
  members,
  selectedId,
  selectedName,
  selectedRole,
  kpis,
  phaseBuckets,
  teamComparison,
}: {
  members: Member[];
  selectedId: string;
  selectedName: string;
  selectedRole: string;
  kpis: Kpis;
  phaseBuckets: PhaseBucket[];
  teamComparison: CompareRow[];
}) {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Performance dashboard"
        description="Pick a team member to see their pipeline, meetings, demos, and how they compare to the rest of the team."
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">Team member</span>
            <select
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2"
              value={selectedId}
              onChange={(e) => router.push(`/dashboard?member=${e.target.value}`)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-xl">{selectedName}</h2>
        <Badge tone="accent">{selectedRole}</Badge>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active leads owned" value={kpis.activeOwned} />
        <StatCard label="Won" value={kpis.wonOwned} hint={`Win rate ${kpis.winRate}%`} />
        <StatCard
          label="Meetings"
          value={kpis.meetingsDone}
          hint={`${kpis.meetingsUpcoming} upcoming`}
        />
        <StatCard
          label="Demos"
          value={kpis.demosDone}
          hint={`${kpis.demosUpcoming} upcoming · ${kpis.outreachAttempts} outreach touches`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`${selectedName.split(" ")[0]} — leads by phase`}>
          <BarChart
            color="var(--meeting)"
            items={phaseBuckets.map((p) => ({
              label: `${p.label} ${p.name}`,
              value: p.count,
            }))}
            valueKey="Active pipeline only"
          />
        </Panel>

        <Panel title="Activity mix">
          <BarChart
            color="var(--demo)"
            items={[
              { label: "Outreach attempts", value: kpis.outreachAttempts },
              { label: "Meetings done", value: kpis.meetingsDone },
              { label: "Meetings upcoming", value: kpis.meetingsUpcoming },
              { label: "Demos done", value: kpis.demosDone },
              { label: "Demos upcoming", value: kpis.demosUpcoming },
              { label: "Activity log", value: kpis.activities },
              { label: "Dropped", value: kpis.droppedOwned },
            ]}
          />
        </Panel>

        <Panel title="Team comparison — active leads" className="lg:col-span-2">
          <BarChart
            color="var(--accent)"
            items={teamComparison.map((r) => ({
              label: r.name.split(" ")[0],
              value: r.active,
            }))}
          />
        </Panel>

        <Panel title="Team comparison — meetings booked" className="lg:col-span-1">
          <BarChart
            color="var(--meeting)"
            items={teamComparison.map((r) => ({
              label: r.name.split(" ")[0],
              value: r.meetings,
            }))}
          />
        </Panel>

        <Panel title="Team comparison — demos" className="lg:col-span-1">
          <BarChart
            color="var(--demo)"
            items={teamComparison.map((r) => ({
              label: r.name.split(" ")[0],
              value: r.demos,
            }))}
          />
        </Panel>

        <Panel title="Scorecard table" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Person</th>
                  <th className="pb-2 pr-3 font-medium">Role</th>
                  <th className="pb-2 pr-3 font-medium">Active</th>
                  <th className="pb-2 pr-3 font-medium">Won</th>
                  <th className="pb-2 pr-3 font-medium">Meetings</th>
                  <th className="pb-2 pr-3 font-medium">Demos</th>
                  <th className="pb-2 font-medium">Touches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {teamComparison.map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === selectedId ? "bg-[var(--accent-soft)]/50" : ""}
                  >
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3">{r.role}</td>
                    <td className="py-2 pr-3">{r.active}</td>
                    <td className="py-2 pr-3">{r.won}</td>
                    <td className="py-2 pr-3">{r.meetings}</td>
                    <td className="py-2 pr-3">{r.demos}</td>
                    <td className="py-2">{r.touches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
