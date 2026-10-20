import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ResearchPrivacy } from "@/components/research-privacy";

export const dynamic = "force-dynamic";

export default async function ResearchPrivacyPage() {
  await requireUser();

  const [suppressions, privacyEvents] = await Promise.all([
    prisma.suppression.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.privacyEvent.findMany({ orderBy: { receivedAt: "desc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Privacy & Suppression"
        description="Do-not-contact suppressions and data-subject privacy events (notice, objection, access, erasure, correction)."
      />
      <ResearchPrivacy
        suppressions={suppressions.map((s) => ({
          id: s.id,
          email: s.email,
          nameDomainKey: s.nameDomainKey,
          reason: s.reason,
          jurisdiction: s.jurisdiction,
          createdAt: s.createdAt.toISOString(),
        }))}
        privacyEvents={privacyEvents.map((e) => ({
          id: e.id,
          personEmail: e.personEmail,
          eventType: e.eventType,
          status: e.status,
          receivedAt: e.receivedAt.toISOString(),
          completedAt: e.completedAt?.toISOString() ?? null,
          notes: e.notes,
        }))}
      />
    </div>
  );
}
