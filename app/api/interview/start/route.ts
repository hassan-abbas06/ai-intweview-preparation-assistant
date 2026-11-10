import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { selectAptitudeQuestions } from "@/lib/interview/aptitude-bank";
import { QuestionDiversityService } from "@/lib/interview/question-diversity";
import { successResponse, errorResponse } from "@/lib/api-response";
import { InterviewType, InterviewModality } from "@prisma/client";

const StartInterviewSchema = z.object({
  type: z.enum(["HR", "DOMAIN", "MANAGERIAL", "APTITUDE"] as const),
  domain: z.string().optional().nullable(),
  focusArea: z.string().max(300).optional().nullable(),
  difficulty: z.enum(["JUNIOR", "INTERMEDIATE", "SENIOR", "LEAD"]).default("INTERMEDIATE"),
  modality: z.enum(["TEXT", "VOICE"]).default("TEXT"),
  jobDescriptionId: z.string().optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t0 = performance.now();
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized. Please sign in first.", 401);
    }

    const body = await req.json();
    const validation = StartInterviewSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        validation.error.errors[0]?.message || "Invalid interview configuration.",
        400
      );
    }

    const { type, domain, focusArea, difficulty, modality, jobDescriptionId } = validation.data;

    // Retrieve database user
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

    // Verify jobDescriptionId if provided
    let validJobDescriptionId: string | null = null;
    if (jobDescriptionId && jobDescriptionId.trim()) {
      const jd = await prisma.jobDescription.findFirst({
        where: {
          id: jobDescriptionId.trim(),
          userId: user.id,
        },
        select: { id: true },
      });

      if (!jd) {
        return errorResponse("Job description not found.", 404);
      }

      validJobDescriptionId = jd.id;
    }

    // Determine target career track
    const effectiveDomain = type === "DOMAIN" ? domain || user.domain || "Software_Engineering" : null;

    if (type === "APTITUDE") {
      // Retrieve recent aptitude sessions and persistent question history for candidate
      const recentSessions = await prisma.interviewSession.findMany({
        where: {
          userId: user.id,
          type: "APTITUDE",
        },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: { focusArea: true },
      });

      const historicalExclusionIds = await QuestionDiversityService.getAptitudeExclusionIds(user.id);
      const combinedExcludedIds = new Set<string>(historicalExclusionIds);

      for (const s of recentSessions) {
        if (s.focusArea) {
          const ids = s.focusArea.split(",").map((id) => id.trim()).filter(Boolean);
          for (const id of ids) {
            combinedExcludedIds.add(id);
          }
        }
      }

      // Randomly select 15 questions balanced across Quant, Logic, and Verbal, excluding past IDs
      const selectedQuestions = selectAptitudeQuestions(Array.from(combinedExcludedIds), 15);
      const questionIdsCsv = selectedQuestions.map((q) => q.id).join(",");

      const newSession = await prisma.interviewSession.create({
        data: {
          userId: user.id,
          type: "APTITUDE",
          domain: null,
          focusArea: questionIdsCsv,
          difficulty,
          modality: modality as InterviewModality,
          ...(validJobDescriptionId ? { jobDescriptionId: validJobDescriptionId } : {}),
        },
      });

      // Record system message with assigned question IDs
      await prisma.interviewMessage.create({
        data: {
          sessionId: newSession.id,
          role: "system",
          content: JSON.stringify({
            type: "APTITUDE_QUESTIONS",
            questionIds: selectedQuestions.map((q) => q.id),
          }),
        },
      });

      // Persist assigned question history so they are excluded across future sessions
      await QuestionDiversityService.recordAptitudeQuestions(user.id, newSession.id, selectedQuestions);

      const elapsed = (performance.now() - t0).toFixed(1);
      console.log(`[API Timing: Start Session] Created Aptitude session ${newSession.id} with 15 questions in ${elapsed}ms`);

      return successResponse(
        {
          sessionId: newSession.id,
          session: newSession,
          questions: selectedQuestions,
        },
        "Aptitude assessment initialized with 15 questions."
      );
    }

    // Create session in PostgreSQL (< 20ms)
    const newSession = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        type: type as InterviewType,
        domain: effectiveDomain,
        focusArea: focusArea || null,
        difficulty,
        modality: modality as InterviewModality,
        ...(validJobDescriptionId ? { jobDescriptionId: validJobDescriptionId } : {}),
      },
    });

    const elapsed = (performance.now() - t0).toFixed(1);
    console.log(`[API Timing: Start Session] Created session ${newSession.id} in ${elapsed}ms`);

    // Return session immediately (<30ms) so the room mounts instantly.
    // The opening question will stream live in real time upon room mount!
    return successResponse(
      {
        sessionId: newSession.id,
        session: newSession,
      },
      "Interview session initialized successfully."
    );
  } catch (err) {
    console.error(`[API Timing: Start Session] Error after ${(performance.now() - t0).toFixed(1)}ms:`, err);
    return errorResponse("Failed to start interview session.", 500, err);
  }
}

