import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized.", 401);
    }

    const searchParams = req.nextUrl.searchParams;

    const rawProblemId = searchParams.get("problemId");
    const problemId =
      rawProblemId !== null && rawProblemId.trim().length > 0
        ? rawProblemId.trim()
        : undefined;

    const rawLimit = searchParams.get("limit");
    let limit = DEFAULT_LIMIT;
    if (rawLimit !== null) {
      const trimmedLimit = rawLimit.trim();
      if (!/^\d+$/.test(trimmedLimit)) {
        return errorResponse(
          `Invalid limit parameter. Must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}.`,
          400
        );
      }
      const parsedLimit = Number(trimmedLimit);
      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit < MIN_LIMIT ||
        parsedLimit > MAX_LIMIT
      ) {
        return errorResponse(
          `Invalid limit parameter. Must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}.`,
          400
        );
      }
      limit = parsedLimit;
    }

    const rawCursor = searchParams.get("cursor");
    let cursor: string | undefined;
    if (rawCursor !== null) {
      const trimmedCursor = rawCursor.trim();
      if (!trimmedCursor) {
        return errorResponse("Invalid cursor parameter.", 400);
      }
      const cursorRecord = await prisma.codingSubmission.findFirst({
        where: {
          id: trimmedCursor,
          userId,
          ...(problemId ? { problemId } : {}),
        },
        select: { id: true },
      });
      if (!cursorRecord) {
        return errorResponse("Invalid cursor parameter.", 400);
      }
      cursor = cursorRecord.id;
    }

    const rows = await prisma.codingSubmission.findMany({
      where: {
        userId,
        ...(problemId ? { problemId } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        problemId: true,
        language: true,
        status: true,
        runtimeMs: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const submissions = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? submissions[submissions.length - 1].id
      : null;

    return successResponse({
      submissions,
      nextCursor,
    });
  } catch (err: unknown) {
    console.error("[API Error 500]: Failed to fetch submissions.");
    return errorResponse("Failed to fetch submissions.", 500);
  }
}
