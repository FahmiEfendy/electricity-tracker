import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateDerivedFields } from "@/lib/recalculate";
import { backfillEstimatedReadings } from "@/lib/backfillEstimates";
import { updateReadingSchema, formatZodError } from "@/lib/validations";
import { verifySameOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rateLimit";

type RouteParams = { params: Promise<{ id: string }> };

// PUT /api/readings/[id] — Admin only: edit a reading
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitError = checkRateLimit(request, "mutation");
    if (rateLimitError) return rateLimitError;

    const csrfError = verifySameOrigin(request);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid ID parameter" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const parsed = updateReadingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { recordedAt: recordedDate, meterKwh, buyKwh, notes } = parsed.data;

    // Check that the reading exists
    const existing = await prisma.meterReading.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Reading not found" },
        { status: 404 }
      );
    }

    // Fetch the previous reading relative to the new recordedAt
    const previousReading = await prisma.meterReading.findFirst({
      where: {
        recordedAt: { lt: recordedDate },
        id: { not: id },
      },
      orderBy: { recordedAt: "desc" },
    });

    // Fetch current tariff
    const tariffSetting = await prisma.setting.findUnique({
      where: { key: "tariff_per_kwh" },
    });
    const tariff = tariffSetting ? parseFloat(tariffSetting.value) : null;

    let hourDiff: number | null = null;
    let kwhUsed: number | null = null;
    let costRp: number | null = null;

    if (previousReading) {
      const diffMs =
        recordedDate.getTime() - previousReading.recordedAt.getTime();
      hourDiff = diffMs / (1000 * 60 * 60);
      kwhUsed = (previousReading.meterKwh + (buyKwh || 0)) - meterKwh;

      if (tariff !== null) {
        costRp = kwhUsed * tariff;
      }
    }

    const updated = await prisma.meterReading.update({
      where: { id },
      data: {
        recordedAt: recordedDate,
        meterKwh,
        buyKwh: buyKwh ?? null,
        hourDiff,
        kwhUsed,
        costRp,
        tariffAtEntry: tariff,
        notes: notes ?? null,
      },
    });

    // Recalculate the NEXT reading's derived fields (the one after this reading)
    const nextReading = await prisma.meterReading.findFirst({
      where: {
        recordedAt: { gt: recordedDate },
        id: { not: id },
      },
      orderBy: { recordedAt: "asc" },
    });
    if (nextReading) {
      await recalculateDerivedFields(nextReading.id);
    }

    await backfillEstimatedReadings();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PUT /api/readings/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/readings/[id] — Admin only: delete a reading
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitError = checkRateLimit(request, "mutation");
    if (rateLimitError) return rateLimitError;

    const csrfError = verifySameOrigin(request);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid ID parameter" }, { status: 400 });
    }

    // Check that the reading exists
    const existing = await prisma.meterReading.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Reading not found" },
        { status: 404 }
      );
    }

    // Find the next reading BEFORE deleting so we can recalculate it
    const nextReading = await prisma.meterReading.findFirst({
      where: {
        recordedAt: { gt: existing.recordedAt },
        id: { not: id },
      },
      orderBy: { recordedAt: "asc" },
    });

    await prisma.meterReading.delete({ where: { id } });

    // Recalculate the next reading's derived fields after deletion
    if (nextReading) {
      await recalculateDerivedFields(nextReading.id);
    }

    await backfillEstimatedReadings();

    return NextResponse.json({ message: "Reading deleted" });
  } catch (error) {
    console.error("DELETE /api/readings/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
