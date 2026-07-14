import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_SCHEMA = "public" } = process.env;
const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}`;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Fetching all readings...");
  const readings = await prisma.meterReading.findMany({
    orderBy: { recordedAt: "asc" },
  });

  console.log(`Found ${readings.length} readings.`);

  const tariffSetting = await prisma.setting.findUnique({
    where: { key: "tariff_per_kwh" },
  });
  const tariff = tariffSetting ? parseFloat(tariffSetting.value) : null;
  console.log(`Current tariff per kWh: ${tariff}`);

  for (let i = 0; i < readings.length; i++) {
    const reading = readings[i];
    const previousReading = i > 0 ? readings[i - 1] : null;

    let hourDiff: number | null = null;
    let kwhUsed: number | null = null;
    let costRp: number | null = null;

    if (previousReading) {
      const diffMs =
        new Date(reading.recordedAt).getTime() - new Date(previousReading.recordedAt).getTime();
      hourDiff = diffMs / (1000 * 60 * 60);

      // Prepaid calculation formula: (prev_meter + buy) - curr_meter
      kwhUsed = (previousReading.meterKwh + (reading.buyKwh || 0)) - reading.meterKwh;

      if (tariff !== null) {
        costRp = kwhUsed * tariff;
      }
    }

    console.log(
      `Recalculating [${reading.recordedAt.toISOString().slice(0, 10)}]: Meter=${reading.meterKwh}, PrevMeter=${previousReading ? previousReading.meterKwh : "None"}, kwhUsed=${kwhUsed}, costRp=${costRp}`
    );

    await prisma.meterReading.update({
      where: { id: reading.id },
      data: {
        hourDiff,
        kwhUsed,
        costRp,
        tariffAtEntry: tariff,
      },
    });
  }

  console.log("✅ Recalculation completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
