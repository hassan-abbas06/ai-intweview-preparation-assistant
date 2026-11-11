export const MAX_REQUESTS_PER_WINDOW = 10;
export const WINDOW_MS = 60_000;

// In-memory Map keyed by userId storing request timestamps
const userTimestampsMap = new Map<string, number[]>();

export function checkRateLimit(userId: string): { allowed: boolean; retryAfterSec: number } {
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
    const retryAfterSec = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    userTimestampsMap.set(userId, valid);
    return { allowed: false, retryAfterSec };
  }

  valid.push(now);
  userTimestampsMap.set(userId, valid);
  return { allowed: true, retryAfterSec: 0 };
}
