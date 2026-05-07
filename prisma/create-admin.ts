import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("Whyte@@@", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@whyte.com" },
    update: { email: "admin@whyte.com", passwordHash: hash },
    create: {
      email: "admin@whyte.com",
      passwordHash: hash,
      name: "Admin",
      role: "super_admin",
      isActive: true,
    },
  });
  console.log("Admin user created/reset → admin@whyte.com / Whyte@@@");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
