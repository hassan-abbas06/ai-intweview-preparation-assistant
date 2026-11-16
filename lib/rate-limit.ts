/**
 * Shared database-backed rate limiter (fixed-window counter).
 *
 * Key convention: "user:{userId}:route:{routeName}" built by callers.
 * STRICT RULE: Keys must NEVER contain IP addresses.
 * Behavior: Fixed-window atomic upsert; fails open with logging if the database errors.
 */

import { prisma } from "@/lib/prisma";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  // Input validation: programmer error must throw synchronously before try/catch
  if (
    typeof limit !== "number" ||
    !Number.isFinite(limit) ||
    limit <= 0 ||
    typeof windowMs !== "number" ||
    !Number.isFinite(windowMs) ||
    windowMs <= 0
  ) {
    throw new Error(
      "Invalid rate limit parameters: limit and windowMs must be positive finite numbers."
    );
  }

  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  try {
    const entry = await prisma.rateLimitEntry.upsert({
      where: {
        key_windowStart: {
          key,
          windowStart,
        },
      },
      create: {
        key,
        windowStart,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
      select: {
        count: true,
      },
    });

    if (entry.count > limit) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: limit - entry.count };
  } catch (error) {
    console.error("[RateLimit:DBError] Database rate limit check failed; failing open:", error);
    return { allowed: true, remaining: limit };
  }
}
