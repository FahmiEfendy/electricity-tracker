import prisma from "@/lib/prisma";

const DEFAULT_TARIFF = 1791.304348;

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
  const tariff = tariffSetting ? parseFloat(tariffSetting.value) : DEFAULT_TARIFF;

  let hourDiff: number | null = reading.hourDiff;
  let kwhUsed: number | null = reading.kwhUsed;
  let costRp: number | null = reading.costRp;

  if (previousReading) {
    const diffMs =
      reading.recordedAt.getTime() - previousReading.recordedAt.getTime();
    hourDiff = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    kwhUsed = parseFloat(
      (previousReading.meterKwh + (reading.buyKwh || 0) - reading.meterKwh).toFixed(2)
    );
    costRp = parseFloat((kwhUsed * tariff).toFixed(2));
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
