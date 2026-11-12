import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/code-execution/rate-limit";
import { validateCodeRequestBody } from "@/lib/code-execution/request";
import { runAgainstTests, TestCase, TestResult } from "@/lib/code-execution/judge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIMEOUT_MS_PER_TEST = 5000;

interface SanitizedSampleTestResult {
  label: string;
  hidden: false;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  runtimeMs: number;
}

interface SanitizedHiddenTestResult {
  label: string;
  hidden: true;
  passed: boolean;
}

type SanitizedTestResult = SanitizedSampleTestResult | SanitizedHiddenTestResult;

function sanitizeResults(
  results: TestResult[],
  sampleTestsCount: number
): SanitizedTestResult[] {
  return results.map((r, index) => {
    if (index < sampleTestsCount) {
      return {
        label: `Sample Test ${index + 1}`,
        hidden: false,
        input: r.input,
        expectedOutput: r.expectedOutput,
        actualOutput: r.actualOutput,
        passed: r.passed,
        runtimeMs: r.runtimeMs,
      };
    }
    return {
      label: `Hidden Test ${index - sampleTestsCount + 1}`,
      hidden: true,
      passed: r.passed,
    };
  });
}

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
        hiddenTests: true,
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

    // f. Run code against sample tests followed by hidden tests
    const sampleTests = (problem.sampleTests as unknown as TestCase[]) || [];
    const hiddenTests = (problem.hiddenTests as unknown as TestCase[]) || [];
    const allTests = [...sampleTests, ...hiddenTests];

    const judgeOutput = await runAgainstTests(
      code,
      language,
      allTests,
      TIMEOUT_MS_PER_TEST
    );

    // Sanitize test results for client and storage
    const sanitizedResults = sanitizeResults(
      judgeOutput.results,
      sampleTests.length
    );

    let errorMessage: string | undefined = undefined;
    if (judgeOutput.overallStatus === "COMPILE_ERROR") {
      errorMessage = judgeOutput.results[0]?.actualOutput;
    } else if (judgeOutput.overallStatus === "RUNTIME_ERROR") {
      const failedSample =
        sampleTests.length > 0
          ? judgeOutput.results
              .slice(0, sampleTests.length)
              .find((r) => r.passed === false)
          : undefined;
      errorMessage = failedSample
        ? failedSample.actualOutput
        : "Your code crashed on a hidden test.";
    }

    let message: string | undefined = undefined;
    if (judgeOutput.overallStatus === "PROVIDER_ERROR") {
      message =
        "The code execution service is temporarily unavailable. Please try again in a moment.";
    }

    // Persist submission row in database
    let submission;
    try {
      submission = await prisma.codingSubmission.create({
        data: {
          userId,
          problemId,
          language,
          code,
          status: judgeOutput.overallStatus,
          testResults: sanitizedResults as unknown as Prisma.InputJsonValue,
          runtimeMs: judgeOutput.totalRuntimeMs,
        },
      });
    } catch (dbErr: unknown) {
      console.error("[API Error 500]: Failed to save coding submission.");
      return errorResponse("Failed to save your submission.", 500);
    }

    const data = {
      id: submission.id,
      overallStatus: judgeOutput.overallStatus,
      results: sanitizedResults,
      totalRuntimeMs: judgeOutput.totalRuntimeMs,
      createdAt: submission.createdAt,
      ...(errorMessage !== undefined ? { errorMessage } : {}),
      ...(message !== undefined ? { message } : {}),
    };

    return successResponse(data);
  } catch (err: unknown) {
    console.error("[API Error 500]: Failed to submit code.");
    return errorResponse("Failed to submit code.", 500);
  }
}
