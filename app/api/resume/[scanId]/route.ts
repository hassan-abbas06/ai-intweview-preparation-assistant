import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
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

    // Load scan log by id AND userId (isolated per-user access)
    const scanLog = await prisma.atsScanLog.findFirst({
      where: {
        id: scanId,
        userId: user.id,
      },
      include: {
        resume: {
          select: {
            fileName: true,
          },
        },
      },
    });

    if (!scanLog) {
      return errorResponse("Scan not found.", 404);
    }

    const suggestionsObj = (scanLog.suggestions && typeof scanLog.suggestions === "object"
      ? scanLog.suggestions
      : {}) as Record<string, unknown>;

    return successResponse({
      id: scanLog.id,
      resumeId: scanLog.resumeId,
      fileName: scanLog.resume?.fileName ?? "resume",
      mode: scanLog.mode,
      score: scanLog.score,
      rawScore: (suggestionsObj.rawScore as number) ?? scanLog.score,
      coverage: (suggestionsObj.coverage as number) ?? 100,
      notChecked: (suggestionsObj.notChecked as string[]) ?? [],
      capReason: (suggestionsObj.capReason as string | null) ?? null,
      subScores: (suggestionsObj.subScores as { formatting: number; content: number } | undefined) ?? null,
      suggestions: scanLog.suggestions,
      jdText: scanLog.jdText,
      timestamp: scanLog.timestamp,
    });
  } catch (err) {
    return errorResponse("Failed to retrieve resume scan.", 500, err);
  }
}
