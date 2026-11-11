import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized.", 401);
    }

    const { slug } = params;

    const problem = await prisma.codingProblem.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        difficulty: true,
        tags: true,
        description: true,
        starterCode: true,
        sampleTests: true,
      },
    });

    if (!problem) {
      return errorResponse("Coding problem not found.", 404);
    }

    return successResponse(problem);
  } catch (err: unknown) {
    return errorResponse("Failed to fetch coding problem.", 500, err);
  }
}
