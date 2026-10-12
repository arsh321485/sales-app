import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/** Wipe ALL business data. No sample/seed records are created. */
const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.importLog.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.demo.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.clientRequest.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.salesResource.deleteMany();
  await prisma.revenueTarget.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  console.log("Database wiped. No sample data added.");
  console.log("Create the first Super Admin with: npm run setup:admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
