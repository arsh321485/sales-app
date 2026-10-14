import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { leadScopeWhere } from "@/lib/scope";
import { followUpLabel } from "@/lib/constants";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const user = await requireUser();
  const rows = await prisma.followUp.findMany({
    where: { lead: { isDeleted: false, ...leadScopeWhere(user) } },
    include: {
      lead: {
        include: { organization: true, product: true, contact: true },
      },
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Pending and completed follow-ups across your leads."
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="pb-2 pr-3 font-medium">Follow-up</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Next Action</th>
                <th className="pb-2 pr-3 font-medium">Lead</th>
                <th className="pb-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((f) => (
                <tr key={f.id} className="align-top">
                  <td className="py-3 pr-3 font-medium">
                    {followUpLabel(f.followUpNumber)}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge tone={f.status === "Pending" ? "warn" : "ok"}>
                      {f.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-[var(--muted)]">
                    {f.nextAction ?? "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <Link
                      href={`/leads/${f.leadId}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {f.lead.leadCode}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {f.lead.organization.orgName}
                      {f.lead.contact ? ` · ${f.lead.contact.fullName}` : ""}
                    </p>
                  </td>
                  <td className="py-3 whitespace-nowrap text-[var(--muted)]">
                    {f.dueAt ? format(f.dueAt, "dd MMM yyyy HH:mm") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No follow-ups yet.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
