import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/code-execution/rate-limit";
import { validateCodeRequestBody } from "@/lib/code-execution/request";
import { runAgainstTests, TestCase } from "@/lib/code-execution/judge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIMEOUT_MS_PER_TEST = 5000;

export async function POST(req: NextRequest) {
  try {
    // a. Authenticate user; session.user.id is strictly required
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse("Unauthorized.", 401);
    }

    // b. Rate limit check (shared bucket per user)
    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.allowed) {
      const res = errorResponse(
        "Too many requests. Please slow down and try again in a minute.",
        429
      );
      res.headers.set("Retry-After", rateLimit.retryAfterSec.toString());
      return res;
    }

    // c. Parse and validate JSON request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse("Invalid JSON in request body.", 400);
    }

    const validation = validateCodeRequestBody(rawBody);
    if (!validation.ok) {
      return errorResponse(validation.message, 400);
    }

    const { problemId, language, code } = validation.value;

    // d. Load problem with selected fields only
    const problem = await prisma.codingProblem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        starterCode: true,
        sampleTests: true,
      },
    });

    if (!problem) {
      return errorResponse("Coding problem not found.", 404);
    }

    // e. Verify language is supported by problem
    const starterMap = (problem.starterCode as Record<string, string>) || {};
    const supportedLanguages = Object.keys(starterMap);
    if (!supportedLanguages.includes(language)) {
      return errorResponse("Unsupported language for this problem.", 400);
    }

    // f. Run code against sample tests
    const sampleTests = (problem.sampleTests as unknown as TestCase[]) || [];
    const judgeOutput = await runAgainstTests(
      code,
      language,
      sampleTests,
      TIMEOUT_MS_PER_TEST
    );

    // g. CodingSubmission row is deliberately NOT created for /run

    // h. Format response
    const mappedResults = judgeOutput.results.map((r, idx) => ({
      label: `Sample Test ${idx + 1}`,
      hidden: false,
      input: r.input,
      expectedOutput: r.expectedOutput,
      actualOutput: r.actualOutput,
      passed: r.passed,
      runtimeMs: r.runtimeMs,
    }));

    let errorMessage: string | undefined = undefined;
    if (
      judgeOutput.overallStatus === "COMPILE_ERROR" ||
      judgeOutput.overallStatus === "RUNTIME_ERROR"
    ) {
      errorMessage = judgeOutput.results[0]?.actualOutput;
    }

    let message: string | undefined = undefined;
    if (judgeOutput.overallStatus === "PROVIDER_ERROR") {
      message =
        "The code execution service is temporarily unavailable. Please try again in a moment.";
    }

    const data = {
      overallStatus: judgeOutput.overallStatus,
      results: mappedResults,
      totalRuntimeMs: judgeOutput.totalRuntimeMs,
      ...(errorMessage !== undefined ? { errorMessage } : {}),
      ...(message !== undefined ? { message } : {}),
    };

    return successResponse(data);
  } catch (err: unknown) {
    console.error("[API Error 500]: Failed to run code.");
    return errorResponse("Failed to run code.", 500);
  }
}
