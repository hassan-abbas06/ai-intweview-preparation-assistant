import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { getQuestionsByIds, selectAptitudeQuestions, AptitudeQuestion } from "@/lib/interview/aptitude-bank";
import { successResponse, errorResponse } from "@/lib/api-response";
import { InterviewDeletionService } from "@/services/interview-deletion";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const t0 = performance.now();
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized.", 401);
    }

    const { sessionId } = params;

    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: { id: true, email: true, domain: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!interviewSession) {
      return errorResponse("Interview session not found.", 404);
    }

    // Authorization check
    if (
      interviewSession.userId !== session.user.id &&
      interviewSession.user.email !== session.user.email
    ) {
      return errorResponse("Forbidden.", 403);
    }

    let questions: AptitudeQuestion[] | undefined = undefined;
    if (interviewSession.type === "APTITUDE") {
      if (interviewSession.focusArea) {
        const questionIds = interviewSession.focusArea.split(",").map((id) => id.trim()).filter(Boolean);
        questions = getQuestionsByIds(questionIds);
      }
      if (!questions || questions.length === 0) {
        questions = selectAptitudeQuestions([], 15);
      }
    }

    console.log(`[API Timing: Get Session] Retrieved session ${sessionId} in ${(performance.now() - t0).toFixed(1)}ms`);

    return successResponse(
      {
        session: interviewSession,
        ...(questions ? { questions } : {}),
      },
      "Session details retrieved successfully."
    );
  } catch (err) {
    console.error(`[API Timing: Get Session] Error after ${(performance.now() - t0).toFixed(1)}ms:`, err);
    return errorResponse("Failed to load interview session.", 500, err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized.", 401);
    }

    let userId = session.user.id;
    if (!userId && session.user.email) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    if (!userId) {
      return errorResponse("User account not found.", 404);
    }

    const { sessionId } = params;
    const result = await InterviewDeletionService.deleteSession(sessionId, userId);

    if (!result.success) {
      if (result.code === "NOT_FOUND") {
        return errorResponse(result.message, 404);
      }
      if (result.code === "FORBIDDEN") {
        return errorResponse(result.message, 403);
      }
      return errorResponse(result.message, 500);
    }

    return successResponse({ sessionId }, result.message);
  } catch (err) {
    console.error("[API Error: Delete Session]:", err);
    return errorResponse("Failed to delete interview session.", 500, err);
  }
}
