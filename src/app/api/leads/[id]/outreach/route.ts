import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isManagerRole } from "@/lib/auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead || lead.isDeleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isManagerRole(user.role) && lead.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const channel = String(body.channel ?? "Call");
  const responseType = String(body.responseType ?? "No Response");
  const notes = String(body.notes ?? "").trim() || null;

  const prev = await prisma.outreachAttempt.count({ where: { leadId: id } });
  const attempt = await prisma.outreachAttempt.create({
    data: {
      leadId: id,
      attemptNo: prev + 1,
      channel,
      responseType,
      notes,
    },
  });

  let phaseStatus = lead.phaseStatus;
  if (responseType === "Connected" || responseType === "Interested") {
    phaseStatus = responseType === "Interested" ? "Interested" : "Connected";
  } else if (responseType === "No Response") {
    phaseStatus = "Attempt Made";
  } else if (responseType === "Not Interested") {
    phaseStatus = "Not Interested";
  }

  await prisma.lead.update({
    where: { id },
    data: {
      phaseStatus,
      nextAction: notes ?? `Follow up after ${channel}`,
      nextActionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: id,
      userId: user.id,
      activityType: "outreach",
      summary: `${channel}: ${responseType}`,
      detail: notes,
    },
  });

  return NextResponse.json(attempt);
}
