import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateDerivedFields } from "@/lib/recalculate";
import { backfillEstimatedReadings } from "@/lib/backfillEstimates";
import {
  getReadingsQuerySchema,
  createReadingSchema,
  formatZodError,
} from "@/lib/validations";
import { verifySameOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rateLimit";

// GET /api/readings — Public: list readings with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const queryResult = getReadingsQuerySchema.safeParse({
      month: searchParams.get("month") ?? undefined,
      year: searchParams.get("year") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: formatZodError(queryResult.error) },
        { status: 400 }
      );
    }

    const { month, year, limit = 15, offset = 0, sort = "desc" } = queryResult.data;

    // Build where clause for optional month/year filtering
    const where: Record<string, unknown> = {};

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      where.recordedAt = { gte: startDate, lt: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      where.recordedAt = { gte: startDate, lt: endDate };
    }

    const readings = await prisma.meterReading.findMany({
      where,
      orderBy: { recordedAt: sort },
      take: limit,
      skip: offset,
    });

    const total = await prisma.meterReading.count({ where });

    // Lightweight select for summary, charts, and monthly report
    const allLightweight = await prisma.meterReading.findMany({
      select: {
        id: true,
        recordedAt: true,
        kwhUsed: true,
        costRp: true,
      },
      orderBy: { recordedAt: "desc" },
    });

    return NextResponse.json({
      data: readings,
      total,
      allReadings: allLightweight,
    });
  } catch (error) {
    console.error("GET /api/readings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/readings — Admin only: create a new meter reading
export async function POST(request: NextRequest) {
  try {
    const rateLimitError = checkRateLimit(request, "mutation");
    if (rateLimitError) return rateLimitError;

    const csrfError = verifySameOrigin(request);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const parsed = createReadingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { recordedAt: recordedDate, meterKwh, buyKwh, notes } = parsed.data;

    // Fetch the previous reading (most recent before this one)
    const previousReading = await prisma.meterReading.findFirst({
      where: { recordedAt: { lt: recordedDate } },
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
    const tariffAtEntry: number | null = tariff;

    if (previousReading) {
      // Calculate time difference in decimal hours
      const diffMs =
        recordedDate.getTime() - previousReading.recordedAt.getTime();
      hourDiff = diffMs / (1000 * 60 * 60);

      // Calculate kWh consumed
      kwhUsed = (previousReading.meterKwh + (buyKwh || 0)) - meterKwh;

      // Calculate cost
      if (tariff !== null && kwhUsed !== null) {
        costRp = kwhUsed * tariff;
      }
    }

    const reading = await prisma.meterReading.create({
      data: {
        recordedAt: recordedDate,
        meterKwh,
        buyKwh: buyKwh ?? null,
        hourDiff,
        kwhUsed,
        costRp,
        tariffAtEntry,
        notes: notes ?? null,
      },
    });

    // Recalculate the NEXT reading's derived fields if inserting between existing readings
    const nextReading = await prisma.meterReading.findFirst({
      where: {
        recordedAt: { gt: recordedDate },
      },
      orderBy: { recordedAt: "asc" },
    });
    if (nextReading) {
      await recalculateDerivedFields(nextReading.id);
    }

    await backfillEstimatedReadings();

    return NextResponse.json({ data: reading }, { status: 201 });
  } catch (error) {
    console.error("POST /api/readings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
