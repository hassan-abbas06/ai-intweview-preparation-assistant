import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized.", 401);
    }

    const solvedRows = await prisma.codingSubmission.findMany({
      where: {
        userId,
        status: "PASSED",
      },
      select: {
        problemId: true,
      },
      distinct: ["problemId"],
    });

    const solvedProblemIds = solvedRows.map((row) => row.problemId);
    return successResponse({ solvedProblemIds });
  } catch (err: unknown) {
    console.error("[API Error 500]: Failed to fetch coding progress.");
    return errorResponse("Failed to fetch coding progress.", 500);
  }
}
