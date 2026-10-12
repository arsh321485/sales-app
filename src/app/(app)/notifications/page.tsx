import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Mark all read
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return (
    <div>
      <PageHeader title="Notifications" description="Assignments, follow-ups, meetings and client requests." />
      <Panel>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((n) => (
            <li key={n.id} className="py-3">
              <p className="font-medium">{n.title}</p>
              {n.body ? <p className="text-xs text-[var(--muted)]">{n.body}</p> : null}
              <p className="text-[11px] text-[var(--muted)]">
                {n.priority} · {n.createdAt.toLocaleString()}
              </p>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="py-8 text-center text-[var(--muted)]">No notifications.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
