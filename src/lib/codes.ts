import { prisma } from "./db";

export async function nextOrgCode() {
  const count = await prisma.organization.count();
  return `ORG-${String(count + 1).padStart(5, "0")}`;
}

export async function nextLeadCode(productCode: string) {
  const prefix = productCode.slice(0, 6).toUpperCase();
  const count = await prisma.lead.count({
    where: { leadCode: { startsWith: `${prefix}-` } },
  });
  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}

export async function nextMeetingCode() {
  const count = await prisma.meeting.count();
  return `MTG-${String(count + 1).padStart(5, "0")}`;
}

export async function nextDemoCode() {
  const count = await prisma.demo.count();
  return `DMO-${String(count + 1).padStart(5, "0")}`;
}
