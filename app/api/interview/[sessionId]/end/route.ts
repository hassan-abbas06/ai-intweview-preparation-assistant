import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-response";
import { ReportPersistenceService } from "@/services/report-persistence";
import { EvaluationWorker } from "@/services/evaluation-worker";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const t0 = Date.now();
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized.", 401);
    }

    const { sessionId } = params;

    const existing = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!existing) {
      return errorResponse("Interview session not found.", 404);
    }

    if (
      existing.userId !== session.user.id &&
      existing.user.email !== session.user.email
    ) {
      return errorResponse("Forbidden.", 403);
    }

    // 1. Mark session COMPLETED according to existing logic
    const updated = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // 2. Trigger worker drain & report initialization non-blockingly in the background
    // This allows the client to navigate to the report page in < 50ms rather than hanging for 15+ seconds.
    setTimeout(() => {
      EvaluationWorker.drainSession(sessionId, 8000)
        .catch((drainErr) => console.warn(`[End Session] Background drain:`, drainErr))
        .finally(() => {
          ReportPersistenceService.getOrGenerateReport(sessionId).catch((reportErr) =>
            console.error(`[End Session] Background report initialization:`, reportErr)
          );
        });
    }, 10);

    const elapsedMs = Date.now() - t0;
    console.log(
      `[API Timing: End Session] Completed session ${sessionId} in ${elapsedMs}ms. Returning immediate redirect.`
    );

    const reportUrl = `/interview/${sessionId}/report`;
    const responsePayload = {
      sessionId,
      sessionStatus: "COMPLETED",
      reportStatus: "PROCESSING",
      reportUrl,
      session: updated,
      timingMs: elapsedMs,
    };

    return NextResponse.json(
      {
        error: false,
        message: "Interview session has ended successfully.",
        sessionId,
        sessionStatus: "COMPLETED",
        reportStatus: "PROCESSING",
        reportUrl,
        data: responsePayload,
      },
      { status: 200 }
    );
  } catch (err) {
    const elapsedMs = Date.now() - t0;
    console.error(`[API Timing: End Session Error] Failed after ${elapsedMs}ms:`, err);
    return errorResponse("Failed to complete interview session.", 500, err);
  }
}
