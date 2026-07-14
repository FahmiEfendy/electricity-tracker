import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { recalculateDerivedFields } from "@/lib/recalculate";

// GET /api/readings — Public: list readings with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Build where clause for optional month/year filtering
    const where: Record<string, unknown> = {};

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);

      if (m < 1 || m > 12) {
        return NextResponse.json(
          { error: "month must be between 1 and 12" },
          { status: 400 }
        );
      }
      if (y < 2024 || y > 2030) {
        return NextResponse.json(
          { error: "year must be between 2024 and 2030" },
          { status: 400 }
        );
      }

      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 1);

      where.recordedAt = {
        gte: startDate,
        lt: endDate,
      };
    } else if (year) {
      const y = parseInt(year, 10);
      if (y < 2024 || y > 2030) {
        return NextResponse.json(
          { error: "year must be between 2024 and 2030" },
          { status: 400 }
        );
      }

      const startDate = new Date(y, 0, 1);
      const endDate = new Date(y + 1, 0, 1);

      where.recordedAt = {
        gte: startDate,
        lt: endDate,
      };
    }

    const readings = await prisma.meterReading.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      take: limit ? parseInt(limit, 10) : undefined,
      skip: offset ? parseInt(offset, 10) : undefined,
    });

    const total = await prisma.meterReading.count({ where });

    return NextResponse.json({ data: readings, total });
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recordedAt, meterKwh, buyKwh, notes } = body;

    if (!recordedAt || meterKwh === undefined || meterKwh === null) {
      return NextResponse.json(
        { error: "recordedAt and meterKwh are required" },
        { status: 400 }
      );
    }

    const recordedDate = new Date(recordedAt);

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
    let tariffAtEntry: number | null = tariff;

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

    return NextResponse.json({ data: reading }, { status: 201 });
  } catch (error) {
    console.error("POST /api/readings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
