import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-response";
import { InterviewDeletionService } from "@/services/interview-deletion";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized.", 401);
    }

    // Resolve userId strictly from authentication session
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

    // Strict ownership boundary: fetch only sessions owned by the authenticated user
    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: {
        report: {
          select: {
            id: true,
            status: true,
            overallScore: true,
            overallPerformanceLevel: true,
            synthesisStatus: true,
            updatedAt: true,
          },
        },
      },
      take: 50,
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      type: s.type,
      domain: s.domain,
      focusArea: s.focusArea,
      difficulty: s.difficulty,
      modality: s.modality,
      status: s.status,
      startedAt: s.startedAt?.toISOString() || null,
      completedAt: s.completedAt?.toISOString() || null,
      createdAt: s.startedAt?.toISOString() || new Date().toISOString(),
      report: s.report
        ? {
            id: s.report.id,
            status: s.report.status,
            overallScore: s.report.overallScore,
            overallPerformanceLevel: s.report.overallPerformanceLevel,
            synthesisStatus: s.report.synthesisStatus,
          }
        : null,
    }));

    return NextResponse.json(
      {
        error: false,
        sessions: formattedSessions,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Interview History Error]:", err);
    return errorResponse("Failed to fetch interview history.", 500, err);
  }
}

export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const filterParam = searchParams.get("filter");
    const filter = filterParam === "completed" ? "completed" : "all";

    const result = await InterviewDeletionService.clearUserSessions(userId, filter);

    return NextResponse.json(
      {
        error: false,
        count: result.count,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Interview History Clear Error]:", err);
    return errorResponse("Failed to clear interview history.", 500, err);
  }
}
