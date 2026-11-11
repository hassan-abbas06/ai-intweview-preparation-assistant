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
      return errorResponse("Unauthorized.", 401);
    }

    const problems = await prisma.codingProblem.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        tags: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return successResponse(problems);
  } catch (err: unknown) {
    return errorResponse("Failed to fetch coding problems.", 500, err);
  }
}
