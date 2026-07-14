import prisma from "@/lib/prisma";

/**
 * Recalculate derived fields for a reading based on its previous reading.
 * If there is no previous reading, derived fields are set to null.
 */
export async function recalculateDerivedFields(readingId: string) {
  const reading = await prisma.meterReading.findUnique({
    where: { id: readingId },
  });
  if (!reading) return;

  const previousReading = await prisma.meterReading.findFirst({
    where: { recordedAt: { lt: reading.recordedAt } },
    orderBy: { recordedAt: "desc" },
  });

  const tariffSetting = await prisma.setting.findUnique({
    where: { key: "tariff_per_kwh" },
  });
  const tariff = tariffSetting ? parseFloat(tariffSetting.value) : null;

  let hourDiff: number | null = null;
  let kwhUsed: number | null = null;
  let costRp: number | null = null;

  if (previousReading) {
    const diffMs =
      reading.recordedAt.getTime() - previousReading.recordedAt.getTime();
    hourDiff = diffMs / (1000 * 60 * 60);
    kwhUsed = (previousReading.meterKwh + (reading.buyKwh || 0)) - reading.meterKwh;

    if (tariff !== null) {
      costRp = kwhUsed * tariff;
    }
  }

  await prisma.meterReading.update({
    where: { id: readingId },
    data: {
      hourDiff,
      kwhUsed,
      costRp,
      tariffAtEntry: tariff,
    },
  });
}
