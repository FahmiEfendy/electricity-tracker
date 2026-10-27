import { NextResponse } from "next/server";

// GET /api/health — Public: liveness check for uptime monitoring
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
