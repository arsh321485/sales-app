import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function wipe() {
  // Clear all collections — no sample leads
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.phaseHistory.deleteMany();
  await prisma.onboarding.deleteMany();
  await prisma.demo.deleteMany();
  await prisma.engagementForm.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.outreachAttempt.deleteMany();
  await prisma.research.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.master.deleteMany();
}

async function main() {
  await wipe();

  const teams = await Promise.all([
    prisma.team.create({ data: { name: "Research", code: "RES" } }),
    prisma.team.create({ data: { name: "Outreach", code: "OUT" } }),
    prisma.team.create({ data: { name: "BDM", code: "BDM" } }),
    prisma.team.create({ data: { name: "Presales / Demo", code: "DEMO" } }),
    prisma.team.create({ data: { name: "Delivery", code: "DEL" } }),
    prisma.team.create({ data: { name: "Management", code: "MGMT" } }),
  ]);

  const products = [
    { code: "VAPTFIX", name: "VAPTFIX" },
    { code: "GRC", name: "GRCDepartment" },
    { code: "AIDL", name: "AIDL" },
    { code: "TMP", name: "TestMyPlan" },
    { code: "GRCM", name: "GRCMentor" },
  ];
  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  const masters = [
    { category: "doc_type", code: "engagement", label: "Engagement Form", sortOrder: 1 },
    { category: "doc_type", code: "proposal", label: "Proposal", sortOrder: 2 },
    { category: "doc_type", code: "contract", label: "Contract", sortOrder: 3 },
    { category: "doc_type", code: "nda", label: "NDA", sortOrder: 4 },
    { category: "doc_type", code: "requirement", label: "Requirement Doc", sortOrder: 5 },
    { category: "doc_type", code: "demo_recording", label: "Demo Recording", sortOrder: 6 },
    { category: "doc_type", code: "other", label: "Other", sortOrder: 7 },
    { category: "industry", code: "manufacturing", label: "Manufacturing", sortOrder: 1 },
    { category: "industry", code: "bfsi", label: "BFSI", sortOrder: 2 },
    { category: "industry", code: "saas", label: "SaaS / IT", sortOrder: 3 },
    { category: "industry", code: "education", label: "Education", sortOrder: 4 },
    { category: "industry", code: "healthcare", label: "Healthcare", sortOrder: 5 },
  ];
  await prisma.master.createMany({ data: masters });

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@company.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  const adminName = process.env.ADMIN_NAME ?? "System Admin";
  const mgmt = teams.find((t) => t.code === "MGMT")!;

  await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      name: adminName,
      role: "Admin",
      teamId: mgmt.id,
      passwordHash: await hash(adminPassword, 12),
    },
  });

  // Clear local upload sample files (keep folder)
  const fs = await import("fs/promises");
  const path = await import("path");
  const uploads = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploads, { recursive: true });
  const files = await fs.readdir(uploads);
  for (const f of files) {
    if (f === ".gitkeep") continue;
    await fs.unlink(path.join(uploads, f)).catch(() => undefined);
  }

  console.log("MongoDB seeded (no sample leads).");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log("Create employees from Admin → Users (each gets their own password).");
  console.log(`Teams ready: ${teams.map((t) => t.code).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
