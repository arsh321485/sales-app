import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const user = await requireUser();
  const rows = await prisma.meeting.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: { lead: { include: { organization: true } } },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Meetings" description="Discovery and commercial meetings logged on leads." />
      <Panel>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <Link href={`/leads/${m.leadId}`} className="font-medium hover:text-[var(--accent)]">
                  {m.lead.organization.orgName}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {m.meetingType ?? "Meeting"}
                  {m.scheduledAt ? ` · ${format(m.scheduledAt, "dd MMM yyyy HH:mm")}` : ""}
                </p>
              </div>
              <Badge>{m.status}</Badge>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-8 text-center text-[var(--muted)]">No meetings yet.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
