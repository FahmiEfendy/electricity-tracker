import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { updateTariffSchema, formatZodError } from "@/lib/validations";
import { verifySameOrigin } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rateLimit";

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

    const parsed = updateTariffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { tariff_per_kwh } = parsed.data;

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
