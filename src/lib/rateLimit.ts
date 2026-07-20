import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const CONFIGS: Record<"auth" | "mutation", RateLimitConfig> = {
  auth: { maxRequests: 5, windowMs: 60 * 1000 },      // 5 requests / 1 min
  mutation: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests / 1 min
};

// In-memory storage: key -> array of timestamps
const rateLimitMap = new Map<string, number[]>();

// Periodically clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter((t) => now - t < 5 * 60 * 1000);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, valid);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Extracts client IP from request headers safely.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Verifies if request rate is within allowed limits for given bucket type.
 * Returns null if allowed, or HTTP 429 NextResponse if rate limit exceeded.
 */
export function checkRateLimit(
  request: NextRequest,
  type: "auth" | "mutation"
): NextResponse | null {
  const config = CONFIGS[type];
  const ip = getClientIp(request);
  const key = `${type}:${ip}`;
  const now = Date.now();

  const windowStart = now - config.windowMs;
  const timestamps = rateLimitMap.get(key) || [];

  // Keep only timestamps within the current sliding window
  const validTimestamps = timestamps.filter((t) => t > windowStart);

  if (validTimestamps.length >= config.maxRequests) {
    const oldestTimestamp = validTimestamps[0];
    const retryAfterSec = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);

    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, retryAfterSec)),
        },
      }
    );
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);

  return null;
}
