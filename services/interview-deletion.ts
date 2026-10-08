import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface DeleteResult {
  success: boolean;
  code: "SUCCESS" | "NOT_FOUND" | "FORBIDDEN" | "ERROR";
  message: string;
}

export interface BulkClearResult {
  success: boolean;
  count: number;
  message: string;
}

export class InterviewDeletionService {
  /**
   * Deletes a single interview session and all child records (report, jobs, messages, history, analysis)
   * with strict user ownership validation.
   */
  static async deleteSession(
    sessionId: string,
    userId: string,
    prismaClient: typeof prisma | Prisma.TransactionClient = prisma
  ): Promise<DeleteResult> {
    const session = await prismaClient.interviewSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true },
    });

    if (!session) {
      return {
        success: false,
        code: "NOT_FOUND",
        message: "Interview session not found.",
      };
    }

    if (session.userId !== userId) {
      return {
        success: false,
        code: "FORBIDDEN",
        message: "You do not have permission to delete this interview session.",
      };
    }

    // Atomically delete all cascading child records then the session itself
    await prisma.$transaction([
      prisma.interviewReport.deleteMany({ where: { sessionId } }),
      prisma.responseAnalysis.deleteMany({ where: { sessionId } }),
      prisma.evaluationJob.deleteMany({ where: { sessionId } }),
      prisma.interviewMessage.deleteMany({ where: { sessionId } }),
      prisma.questionHistory.deleteMany({ where: { sessionId } }),
      prisma.interviewSession.delete({ where: { id: sessionId } }),
    ]);

    return {
      success: true,
      code: "SUCCESS",
      message: "Interview session and all associated records deleted successfully.",
    };
  }

  /**
   * Deletes only the report of an interview session, leaving conversation & session intact.
   */
  static async deleteReportOnly(
    sessionId: string,
    userId: string,
    prismaClient: typeof prisma | Prisma.TransactionClient = prisma
  ): Promise<DeleteResult> {
    const session = await prismaClient.interviewSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, score: true },
    });

    if (!session) {
      return {
        success: false,
        code: "NOT_FOUND",
        message: "Interview session not found.",
      };
    }

    if (session.userId !== userId) {
      return {
        success: false,
        code: "FORBIDDEN",
        message: "You do not have permission to delete this report.",
      };
    }

    await prisma.$transaction([
      prisma.interviewReport.deleteMany({ where: { sessionId } }),
      prisma.interviewSession.update({
        where: { id: sessionId },
        data: { score: null },
      }),
    ]);

    return {
      success: true,
      code: "SUCCESS",
      message: "Interview report deleted successfully.",
    };
  }

  /**
   * Bulk clears interview sessions and reports for a given user.
   * Supports filtering by 'all' or 'completed'.
   */
  static async clearUserSessions(
    userId: string,
    filter: "all" | "completed" = "all"
  ): Promise<BulkClearResult> {
    const sessions = await prisma.interviewSession.findMany({
      where: {
        userId,
        ...(filter === "completed" ? { status: "COMPLETED" } : {}),
      },
      select: { id: true },
    });

    if (sessions.length === 0) {
      return {
        success: true,
        count: 0,
        message: "No interview sessions found to delete.",
      };
    }

    const sessionIds = sessions.map((s) => s.id);

    await prisma.$transaction([
      prisma.interviewReport.deleteMany({ where: { sessionId: { in: sessionIds } } }),
      prisma.responseAnalysis.deleteMany({ where: { sessionId: { in: sessionIds } } }),
      prisma.evaluationJob.deleteMany({ where: { sessionId: { in: sessionIds } } }),
      prisma.interviewMessage.deleteMany({ where: { sessionId: { in: sessionIds } } }),
      prisma.questionHistory.deleteMany({ where: { sessionId: { in: sessionIds } } }),
      prisma.interviewSession.deleteMany({ where: { id: { in: sessionIds } } }),
    ]);

    return {
      success: true,
      count: sessionIds.length,
      message: `Successfully cleared ${sessionIds.length} interview session${sessionIds.length === 1 ? "" : "s"}.`,
    };
  }
}
