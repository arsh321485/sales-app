import { prisma } from "./db";

/** Minimal phase engine: validate exit gates and move lead in one place. */
export async function transitionLead(params: {
  leadId: string;
  toPhase: number;
  toStatus: string;
  changedById?: string;
  reason?: string;
  outcome?: "Active" | "Won" | "Dropped" | "OnHold";
}) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: params.leadId } });

  const daysInPrev =
    Math.max(
      0,
      Math.round((Date.now() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    ) || 0;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: params.leadId },
      data: {
        currentPhase: params.toPhase,
        phaseStatus: params.toStatus,
        furthestPhaseReached: Math.max(lead.furthestPhaseReached, params.toPhase),
        outcome: params.outcome ?? lead.outcome,
      },
    });

    await tx.phaseHistory.create({
      data: {
        leadId: params.leadId,
        fromPhase: lead.currentPhase,
        toPhase: params.toPhase,
        fromStatus: lead.phaseStatus,
        toStatus: params.toStatus,
        changedById: params.changedById,
        reason: params.reason,
        daysInPrevPhase: daysInPrev,
      },
    });

    await tx.activityLog.create({
      data: {
        leadId: params.leadId,
        userId: params.changedById,
        activityType: "phase_transition",
        summary: `Moved to Phase ${params.toPhase}: ${params.toStatus}`,
        detail: params.reason,
      },
    });

    return updated;
  });
}
