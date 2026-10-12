import { prisma } from "./db";

/** Sequential product-specific Lead ID: VF001, GM001, ... */
export async function nextLeadCode(productId: string): Promise<string> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const n = product.nextNumber;
  await prisma.product.update({
    where: { id: productId },
    data: { nextNumber: n + 1 },
  });
  return `${product.prefix}${String(n).padStart(3, "0")}`;
}

export async function logActivity(params: {
  leadId: string;
  userId?: string | null;
  activityType: string;
  title: string;
  detail?: string | null;
  metaJson?: string | null;
  occurredAt?: Date;
}) {
  return prisma.activity.create({
    data: {
      leadId: params.leadId,
      userId: params.userId ?? undefined,
      activityType: params.activityType,
      title: params.title,
      detail: params.detail ?? undefined,
      metaJson: params.metaJson ?? undefined,
      occurredAt: params.occurredAt ?? new Date(),
    },
  });
}

export async function notify(params: {
  userId: string;
  leadId?: string | null;
  eventType: string;
  title: string;
  body?: string;
  priority?: "High" | "Medium" | "Normal";
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      leadId: params.leadId ?? undefined,
      eventType: params.eventType,
      title: params.title,
      body: params.body,
      priority: params.priority ?? "Normal",
    },
  });
}
