import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized.", 401);
    }

    const submissionId = params?.id?.trim();
    if (!submissionId) {
      return errorResponse("Submission not found.", 404);
    }

    const submission = await prisma.codingSubmission.findFirst({
      where: {
        id: submissionId,
        userId,
      },
      select: {
        id: true,
        problemId: true,
        language: true,
        code: true,
        status: true,
        testResults: true,
        runtimeMs: true,
        createdAt: true,
      },
    });

    if (!submission) {
      return errorResponse("Submission not found.", 404);
    }

    return successResponse(submission);
  } catch (err: unknown) {
    console.error("[API Error 500]: Failed to fetch submission.");
    return errorResponse("Failed to fetch submission.", 500);
  }
}
