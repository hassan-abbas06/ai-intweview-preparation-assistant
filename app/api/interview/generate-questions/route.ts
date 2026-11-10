import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { extractJobDescription } from "@/lib/interview/jd-extractor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GenerateQuestionsSchema = z.object({
  rawText: z
    .string({ required_error: "Job description text is required." })
    .refine((val) => {
      const trimmed = val.trim();
      return trimmed.length >= 1 && trimmed.length <= 20000;
    }, {
      message: "Job description text must be between 1 and 20,000 characters.",
    }),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth required -> 401 if unauthenticated
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

    // 2. Validate body (Zod) -> 400 without calling LLM if invalid/empty/too long
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON payload.", 400);
    }

    const validation = GenerateQuestionsSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.errors[0]?.message || "Invalid job description text.",
        400
      );
    }

    const { rawText } = validation.data;

    // 3. Call extractJobDescription(rawText) (never throws)
    const extracted = await extractJobDescription(rawText);

    // 4. Create JobDescription row via Prisma
    let jobDescription;
    try {
      jobDescription = await prisma.jobDescription.create({
        data: {
          userId: user.id,
          rawText, // stored in FULL
          extractedRole: extracted.role,
          extractedSeniority: extracted.seniority,
          extractedSkills: extracted.skills,
          extractedResponsibilities: extracted.responsibilities,
          extractionConfidence: extracted.confidence,
        },
      });
    } catch (dbErr: any) {
      console.error("[generate-questions API] Database write failure:", dbErr);
      return errorResponse("Failed to save job description.", 500, dbErr);
    }

    // 5. Return 200 using the project's uniform shape
    return successResponse(
      {
        jobDescriptionId: jobDescription.id,
        role: jobDescription.extractedRole,
        seniority: jobDescription.extractedSeniority,
        skills: jobDescription.extractedSkills,
        responsibilities: jobDescription.extractedResponsibilities,
        confidence: jobDescription.extractionConfidence,
      },
      "Job description processed",
      200
    );
  } catch (err: any) {
    console.error("[generate-questions API] Unexpected server error:", err);
    return errorResponse("Failed to process job description.", 500, err);
  }
}
