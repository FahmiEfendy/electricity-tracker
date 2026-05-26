import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed default tariff setting
  await prisma.setting.upsert({
    where: { key: "tariff_per_kwh" },
    update: {},
    create: {
      key: "tariff_per_kwh",
      value: "1791.3",
    },
  });

  console.log("✅ Seed completed: Default tariff set to Rp 1,791.3/kWh");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
