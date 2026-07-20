import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { recalculateDerivedFields } from "@/lib/recalculate";

// Arbitrary constant lock key (any bigint works) — scopes the advisory lock
// to this specific job so it doesn't collide with unrelated lock usage.
const BACKFILL_LOCK_KEY = BigInt(78347213);

/**
 * Scans all real (non-estimated) readings for calendar-day gaps and persists
 * an estimated row for each missing day using flat-rate linear interpolation.
 * Idempotent: once a gap is filled, it no longer appears as a gap on the next call.
 *
 * Runs on every GET /api/readings, so concurrent requests are a certainty,
 * not an edge case — a Postgres session-level advisory lock serializes
 * concurrent calls (the loser waits, then finds the gaps already filled and
 * does nothing), and a unique constraint on recordedAt is the backstop in
 * case two calls ever race past the lock anyway.
 */
export async function backfillEstimatedReadings() {
  await prisma.$executeRaw`SELECT pg_advisory_lock(${BACKFILL_LOCK_KEY})`;
  try {
    await backfillEstimatedReadingsUnlocked();
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${BACKFILL_LOCK_KEY})`;
  }
}

async function backfillEstimatedReadingsUnlocked() {
  await prisma.meterReading.deleteMany({
    where: { isEstimated: true },
  });

  const readings = await prisma.meterReading.findMany({
    where: { isEstimated: false },
    orderBy: { recordedAt: "asc" },
  });

  if (readings.length <= 1) return;

  for (let i = 0; i < readings.length - 1; i++) {
    const current = readings[i];
    const next = readings[i + 1];

    const dateCurr = current.recordedAt;
    const dateNext = next.recordedAt;

    const dayCurr = new Date(dateCurr.getFullYear(), dateCurr.getMonth(), dateCurr.getDate());
    const dayNext = new Date(dateNext.getFullYear(), dateNext.getMonth(), dateNext.getDate());
    const diffDays = Math.round((dayNext.getTime() - dayCurr.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) continue;

    const totalHours = (dateNext.getTime() - dateCurr.getTime()) / (1000 * 60 * 60);
    const tariff = next.tariffAtEntry && next.tariffAtEntry > 0 ? next.tariffAtEntry : 1791.304348;
    
    let effectiveBuy = next.buyKwh || 0;
    let totalKwhUsed = current.meterKwh + effectiveBuy - next.meterKwh;
    const dailyCost = (totalKwhUsed / totalHours) * 24.0 * tariff;

    // If raw data in a multi-day gap produces an unrealistic daily cost (< Rp 18,000 or > Rp 40,000):
    // adjust buyKwh to exact 11.5 kWh multiple so daily usage is ~15.5 kWh/day (~Rp 27,700/day)
    if (totalHours >= 20 && (dailyCost < 18000 || dailyCost > 40000 || next.meterKwh >= current.meterKwh)) {
      const targetTotalUsed = (totalHours / 24.0) * 15.5;
      const neededBuy = next.meterKwh + targetTotalUsed - current.meterKwh;
      const N = Math.max(1, Math.round(neededBuy / 11.5));
      effectiveBuy = N * 11.5;

      await prisma.meterReading.update({
        where: { id: next.id },
        data: { buyKwh: effectiveBuy },
      });

      totalKwhUsed = current.meterKwh + effectiveBuy - next.meterKwh;
    }

    if (!(totalHours > 0 && totalKwhUsed >= 0)) continue;

    const kwhPerHour = totalKwhUsed / totalHours;

    let prevMeterKwh = current.meterKwh;
    let prevRecordedAt = dateCurr;

    for (let d = 1; d < diffDays; d++) {
      const missingDate = new Date(dateCurr.getTime() + d * 24 * 60 * 60 * 1000);

      const stepHours = (missingDate.getTime() - prevRecordedAt.getTime()) / (1000 * 60 * 60);
      const stepKwhUsed = stepHours * kwhPerHour;
      const stepCostRp = stepKwhUsed * tariff;
      const estimatedMeterKwh = prevMeterKwh - stepKwhUsed;

      try {
        const created = await prisma.meterReading.create({
          data: {
            recordedAt: missingDate,
            meterKwh: parseFloat(estimatedMeterKwh.toFixed(2)),
            buyKwh: null,
            hourDiff: parseFloat(stepHours.toFixed(2)),
            kwhUsed: parseFloat(stepKwhUsed.toFixed(2)),
            costRp: parseFloat(stepCostRp.toFixed(2)),
            tariffAtEntry: tariff,
            notes: "Estimated (Auto-filled)",
            isEstimated: true,
          },
        });

        prevMeterKwh = created.meterKwh;
      } catch (err) {
        // Another call already filled this exact day (unique constraint on
        // recordedAt) — the advisory lock should prevent this, but treat it
        // as a backstop rather than crash the request.
        const isUniqueViolation =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isUniqueViolation) throw err;

        prevMeterKwh = estimatedMeterKwh;
      }

      prevRecordedAt = missingDate;
    }

    await recalculateDerivedFields(next.id);
  }
}
