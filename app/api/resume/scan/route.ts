import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma, AtsScanMode } from "@prisma/client";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/api-response";
import { scoreResume } from "@/lib/resume/ats-score";
import { ParsedResume } from "@/lib/resume/parse";

export const dynamic = "force-dynamic";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_SCANS_PER_WINDOW = 20;

// Best-effort in-memory limiter. Per-instance only: replace with a shared store if traffic grows.
const scanLog = new Map<string, number[]>();
function allowScan(userId: string): boolean {
  const now = Date.now();
  const recent = (scanLog.get(userId) ?? []).filter((t) => t > now - WINDOW_MS);
  if (recent.length >= MAX_SCANS_PER_WINDOW) {
    scanLog.set(userId, recent);
    return false;
  }
  recent.push(now);
  scanLog.set(userId, recent);
  return true;
}

const ScanInputSchema = z.object({
  resumeId: z.string().min(1, "resumeId is required"),
  jobDescription: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
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

    if (!allowScan(user.id)) {
      return rateLimitResponse("Scan limit reached (20 per hour). Please try again later.");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON payload.", 400);
    }

    const validation = ScanInputSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0]?.message || "Invalid input parameters.", 400);
    }

    const { resumeId, jobDescription } = validation.data;

    let trimmedJd: string | null = null;
    if (jobDescription !== undefined && jobDescription !== null) {
      const trimmed = jobDescription.trim();
      // If a JD was provided, it must satisfy length bounds (never silently fall back to GENERAL)
      if (trimmed.length < 50 || trimmed.length > 8000) {
        return errorResponse("Job description must be between 50 and 8000 characters.", 400);
      }
      trimmedJd = trimmed;
    }

    // Load Resume and verify ownership (not found or not owned = 404)
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: user.id,
      },
    });

    if (!resume) {
      return errorResponse("Resume not found.", 404);
    }

    const parsed = resume.parsedData as unknown as ParsedResume;
    if (!parsed || !parsed.text) {
      return errorResponse("Resume has no usable text layer.", 422);
    }

    // Deterministic ATS Scoring (No LLM calls)
    const result = scoreResume(parsed, trimmedJd);

    // Create a NEW AtsScanLog row for every scan
    const scanRecord = await prisma.atsScanLog.create({
      data: {
        userId: user.id,
        resumeId: resume.id,
        mode: result.mode as AtsScanMode,
        jdText: trimmedJd || null,
        score: result.score,
        suggestions: {
          checks: result.checks,
          keywords: result.keywords,
          llm: null,
          coverage: result.coverage,
          notChecked: result.notChecked,
          capReason: result.capReason,
          rawScore: result.rawScore,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return successResponse(
      {
        scanId: scanRecord.id,
        score: result.score,
        rawScore: result.rawScore,
        coverage: result.coverage,
        notChecked: result.notChecked,
        capReason: result.capReason,
        mode: result.mode,
        checks: result.checks,
        keywords: result.keywords,
      },
      "Resume scanned successfully."
    );
  } catch (err) {
    return errorResponse("Failed to scan resume.", 500, err);
  }
}
