import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/api-response";
import { generateSuggestions } from "@/lib/resume/suggestions";
import { ParsedResume } from "@/lib/resume/parse";
import { AtsCheckItem } from "@/lib/resume/ats-score";
import { KeywordMatchResult } from "@/lib/resume/keywords";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MS = 60 * 60 * 1000;
const MAX_RETRIES_PER_WINDOW = 10;

// Best-effort in-memory limiter for suggestions retries
const suggestionsRetryLog = new Map<string, number[]>();
function allowSuggestionsRetry(userId: string): boolean {
  const now = Date.now();
  const recent = (suggestionsRetryLog.get(userId) ?? []).filter((t) => t > now - WINDOW_MS);
  if (recent.length >= MAX_RETRIES_PER_WINDOW) {
    suggestionsRetryLog.set(userId, recent);
    return false;
  }
  recent.push(now);
  suggestionsRetryLog.set(userId, recent);
  return true;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized. Please sign in first.", 401);
    }

    let user = session.user.id
      ? await prisma.user.findUnique({ where: { id: session.user.id } })
      : null;
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.trim().toLowerCase() },
      });
    }
    if (!user) {
      return errorResponse("Candidate account not found.", 404);
    }

    const { scanId } = params;
    if (!scanId) {
      return errorResponse("Missing scan ID.", 400);
    }

    if (!allowSuggestionsRetry(user.id)) {
      return rateLimitResponse("Suggestions refresh limit reached (10 per hour). Please try again later.");
    }

    // Load scan log by id AND userId (isolated per-user access)
    const scanLog = await prisma.atsScanLog.findFirst({
      where: {
        id: scanId,
        userId: user.id,
      },
      include: {
        resume: true,
      },
    });

    if (!scanLog || !scanLog.resume) {
      return errorResponse("Scan not found.", 404);
    }

    const parsed = scanLog.resume.parsedData as unknown as ParsedResume;
    if (!parsed || !parsed.text) {
      return errorResponse("Resume text is unavailable for suggestions.", 422);
    }

    const existingSuggestions = (scanLog.suggestions && typeof scanLog.suggestions === "object"
      ? scanLog.suggestions
      : {}) as Record<string, unknown>;

    const checks = (existingSuggestions.checks as AtsCheckItem[]) || [];
    const keywords = (existingSuggestions.keywords as KeywordMatchResult | null) || null;

    const newSuggestions = await generateSuggestions({
      text: parsed.text,
      checks,
      keywords,
      mode: scanLog.mode as "JOB_TARGETED" | "GENERAL",
      jdText: scanLog.jdText,
    });

    const updatedSuggestions = {
      ...existingSuggestions,
      llm: newSuggestions,
    };

    await prisma.atsScanLog.update({
      where: { id: scanLog.id },
      data: {
        suggestions: updatedSuggestions as unknown as Prisma.InputJsonValue,
      },
    });

    return successResponse(
      { llm: newSuggestions },
      "Suggestions refreshed successfully."
    );
  } catch (err) {
    return errorResponse("Failed to refresh suggestions.", 500, err);
  }
}
