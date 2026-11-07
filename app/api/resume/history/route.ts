import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
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

    const scans = await prisma.atsScanLog.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 20,
      include: {
        resume: {
          select: {
            fileName: true,
          },
        },
      },
    });

    const history = [];
    for (let i = 0; i < scans.length; i++) {
      const item = scans[i];
      const suggestionsObj = (item.suggestions && typeof item.suggestions === "object"
        ? item.suggestions
        : {}) as Record<string, unknown>;

      history.push({
        scanId: item.id,
        fileName: item.resume?.fileName ?? "resume",
        mode: item.mode,
        score: item.score,
        coverage: typeof suggestionsObj.coverage === "number" ? suggestionsObj.coverage : 100,
        timestamp: item.timestamp,
      });
    }

    return successResponse(history);
  } catch (err) {
    return errorResponse("Failed to retrieve scan history.", 500, err);
  }
}
