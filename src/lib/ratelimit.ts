import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Upstash Redis-based Rate Limiter for Next.js (Edge compatible).
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 */

const hasRedisCreds = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (!hasRedisCreds) {
  // In production, fail-closed for cost-bearing endpoints (see N5).
  // We still construct the Redis client so callers don't crash on import,
  // but checkRateLimit() will fail-closed on AI / auth routes when creds are missing.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "CRITICAL: UPSTASH_REDIS_REST_* missing in production. AI and auth routes will be rejected."
    );
  }
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Restrictive limiter for AI/LLM operations to control costs.
export const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "ratelimit:ai",
});

// General limiter for common API metadata/read operations.
export const globalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
  prefix: "ratelimit:global",
});

// Strict limiter for auth routes — protects against TOTP brute force (C2).
// 10 attempts / 15min per identifier (typically IP). Tighter limits applied
// per-challenge inside src/lib/twofa-challenge.ts.
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  analytics: true,
  prefix: "ratelimit:auth",
});

const AI_ROUTE_PREFIXES = [
  "/api/stress-test",
  "/api/idea-refinement",
  "/api/copywriter",
  "/api/persona",
  "/api/berumen",
  "/api/scorecard",
  "/api/action-card",
];

function isAIRoute(path: string): boolean {
  return AI_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isAuthRoute(path: string): boolean {
  // NextAuth endpoints + our 2FA enrollment endpoints.
  return path.startsWith("/api/auth") || path.startsWith("/api/2fa");
}

/**
 * Utility to check if a request should be rate-limited.
 * Returns success=false on cost-bearing routes when Redis is unconfigured (fail-closed).
 */
export async function checkRateLimit(identifier: string, path: string) {
  if (!hasRedisCreds) {
    // Fail-closed for AI and auth routes; fail-open for read-only metadata
    // routes so we don't break local dev.
    if (isAIRoute(path) || isAuthRoute(path)) {
      return { success: false, limit: 0, remaining: 0, reset: 0 };
    }
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  const limiter = isAIRoute(path)
    ? aiLimiter
    : isAuthRoute(path)
    ? authLimiter
    : globalLimiter;

  return await limiter.limit(identifier);
}
