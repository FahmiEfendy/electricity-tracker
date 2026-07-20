import { NextRequest, NextResponse } from "next/server";

/**
 * Verifies that state-changing requests (POST, PUT, DELETE, PATCH) originate
 * from the same origin as the application host (Same-Origin CSRF protection).
 *
 * Returns null if the check passes, or a 403 Forbidden NextResponse if it fails.
 */
export function verifySameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!host) {
    return NextResponse.json(
      { error: "CSRF check failed: Missing Host header" },
      { status: 403 }
    );
  }

  const checkHeader = origin || referer;
  if (!checkHeader) {
    return NextResponse.json(
      { error: "CSRF check failed: Missing Origin and Referer headers" },
      { status: 403 }
    );
  }

  try {
    const headerUrl = new URL(checkHeader);
    const headerHost = headerUrl.host;

    if (headerHost.toLowerCase() !== host.toLowerCase()) {
      return NextResponse.json(
        { error: "CSRF check failed: Cross-origin request rejected" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "CSRF check failed: Malformed Origin or Referer header" },
      { status: 403 }
    );
  }

  return null;
}
