import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/settings — Public: fetch current tariff
export async function GET() {
  try {
    const tariffSetting = await prisma.setting.findUnique({
      where: { key: "tariff_per_kwh" },
    });

    return NextResponse.json({
      tariff_per_kwh: tariffSetting?.value ?? null,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/settings — Admin only: update tariff
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tariff_per_kwh } = body;

    if (tariff_per_kwh === undefined || tariff_per_kwh === null) {
      return NextResponse.json(
        { error: "tariff_per_kwh is required" },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.upsert({
      where: { key: "tariff_per_kwh" },
      update: { value: String(tariff_per_kwh) },
      create: { key: "tariff_per_kwh", value: String(tariff_per_kwh) },
    });

    return NextResponse.json({
      tariff_per_kwh: setting.value,
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
