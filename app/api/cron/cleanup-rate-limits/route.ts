/**
 * RateLimitEntry cleanup endpoint.
 *
 * Purpose: Purges RateLimitEntry records whose windowStart is older than the
 * retention window (2 hours), keeping table size bounded under high traffic.
 * Called on a scheduled interval by an external scheduler (cron-job.org).
 *
 * Auth: Requires CRON_SECRET via "Authorization: Bearer <secret>" or "x-cron-secret: <secret>".
 * Privacy: No IP addresses are read or logged. No secret headers or values are logged.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_LIMIT_RETENTION_MS = 2 * 60 * 60 * 1000; // 2 hours

function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest) {
  // Auth BEFORE any database access
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim() === "") {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const cronHeader = req.headers.get("x-cron-secret");
  const bearerMatch = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  const isBearerValid = bearerMatch ? constantTimeCompare(bearerMatch, cronSecret) : false;
  const isHeaderValid = cronHeader ? constantTimeCompare(cronHeader, cronSecret) : false;

  if (!isBearerValid && !isHeaderValid) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid CRON_SECRET" },
      { status: 401 }
    );
  }

  try {
    const cutoff = new Date(Date.now() - RATE_LIMIT_RETENTION_MS);
    const result = await prisma.rateLimitEntry.deleteMany({
      where: {
        windowStart: {
          lt: cutoff,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        deleted: result.count,
        cutoff: cutoff.toISOString(),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[RateLimit:CleanupError]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit cleanup failed",
      },
      { status: 500 }
    );
  }
}
