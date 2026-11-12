import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const MAX_REQUESTS_PER_WINDOW = 10;
export const WINDOW_MS = 60_000;
const SLIDING_WINDOW_DURATION = "60 s" as const;

// Fallback in-memory Map keyed by userId storing request timestamps
const userTimestampsMap = new Map<string, number[]>();

let ratelimitInstance: Ratelimit | null = null;
let warnedMissingUpstash = false;

function hasUpstashConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function getRateLimiter(): Ratelimit {
  if (!ratelimitInstance) {
    ratelimitInstance = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(
        MAX_REQUESTS_PER_WINDOW,
        SLIDING_WINDOW_DURATION
      ),
      prefix: "ratelimit:coding",
      analytics: false,
    });
  }
  return ratelimitInstance;
}

function checkInMemoryRateLimit(userId: string): {
  allowed: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Prune expired entries across the map when size grows above 1000
  if (userTimestampsMap.size > 1000) {
    userTimestampsMap.forEach((timestamps: number[], key: string) => {
      const valid = timestamps.filter((t: number) => t > windowStart);
      if (valid.length === 0) {
        userTimestampsMap.delete(key);
      } else {
        userTimestampsMap.set(key, valid);
      }
    });
  }

  const existing = userTimestampsMap.get(userId) || [];
  const valid = existing.filter((t: number) => t > windowStart);

  if (valid.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = valid[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + WINDOW_MS - now) / 1000)
    );
    userTimestampsMap.set(userId, valid);
    return { allowed: false, retryAfterSec };
  }

  valid.push(now);
  userTimestampsMap.set(userId, valid);
  return { allowed: true, retryAfterSec: 0 };
}

export async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  if (!hasUpstashConfig()) {
    if (!warnedMissingUpstash) {
      warnedMissingUpstash = true;
      console.warn("Upstash not configured, using in-memory rate limiter");
    }
    return checkInMemoryRateLimit(userId);
  }

  try {
    const limiter = getRateLimiter();
    const { success, reset } = await limiter.limit(userId);
    if (success) {
      return { allowed: true, retryAfterSec: 0 };
    }
    const rawRetryAfterSec = Math.ceil((reset - Date.now()) / 1000);
    const retryAfterSec = Number.isFinite(rawRetryAfterSec)
      ? Math.max(1, rawRetryAfterSec)
      : 1;
    return { allowed: false, retryAfterSec };
  } catch {
    console.error("[RateLimit] Upstash rate limit check failed; failing open.");
    return { allowed: true, retryAfterSec: 0 };
  }
}
