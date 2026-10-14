import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const user = await requireUser();
  const rows = await prisma.meeting.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: {
      lead: {
        include: { organization: true, contact: true, owner: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Discovery and commercial meetings logged on leads."
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">Lead ID</th>
                <th className="pb-2 pr-3 font-medium">Company</th>
                <th className="pb-2 pr-3 font-medium">Contact Name</th>
                <th className="pb-2 pr-3 font-medium">Meeting Date</th>
                <th className="pb-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/leads/${m.leadId}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {m.lead.leadCode}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">{m.lead.organization.orgName}</td>
                  <td className="py-3 pr-3">
                    {m.lead.contact?.fullName ?? "—"}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {m.scheduledAt
                      ? format(m.scheduledAt, "dd MMM yyyy HH:mm")
                      : "—"}
                  </td>
                  <td className="py-3">{m.lead.owner?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No meetings yet.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
