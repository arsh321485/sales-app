import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/** Create Super Admin from .env only when no users exist. Not sample data. */
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log("Users already exist — skipping setup:admin.");
    return;
  }

  const email = (process.env.ADMIN_EMAIL ?? "admin@company.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  const name = process.env.ADMIN_NAME ?? "System Admin";

  await prisma.user.create({
    data: {
      email,
      name,
      role: "SuperAdmin",
      passwordHash: await hash(password, 12),
    },
  });

  console.log(`Super Admin created: ${email}`);
  console.log("Add products and employees from Settings after login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
