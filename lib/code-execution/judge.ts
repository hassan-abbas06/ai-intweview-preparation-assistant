import { getCodeExecutionProvider, CodeExecutionUnavailableError } from "./index";

export type SubmissionStatus =
  | "PENDING"
  | "PASSED"
  | "FAILED"
  | "COMPILE_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "PROVIDER_ERROR";

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  runtimeMs: number;
}

export async function runAgainstTests(
  code: string,
  language: string,
  tests: TestCase[],
  timeoutMsPerTest: number = 10000
): Promise<{ overallStatus: SubmissionStatus; results: TestResult[]; totalRuntimeMs: number }> {
  if (!tests || tests.length === 0) {
    throw new Error("No tests provided");
  }

  const provider = getCodeExecutionProvider();
  const results: TestResult[] = [];

  let timeoutCount = 0;
  let runtimeErrorCount = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];

    let execRes;
    try {
      execRes = await provider.execute({
        language,
        code,
        stdin: test.input,
        timeoutMs: timeoutMsPerTest,
      });
    } catch (err: unknown) {
      if (err instanceof CodeExecutionUnavailableError) {
        return {
          overallStatus: "PROVIDER_ERROR",
          results,
          totalRuntimeMs: results.reduce((sum, r) => sum + r.runtimeMs, 0),
        };
      }
      throw err;
    }

    // 2. If compileError is non-null: stop immediately
    if (execRes.compileError !== null) {
      const compileResult: TestResult = {
        input: test.input,
        expectedOutput: test.expectedOutput,
        actualOutput: execRes.compileError,
        passed: false,
        runtimeMs: execRes.runtimeMs,
      };
      return {
        overallStatus: "COMPILE_ERROR",
        results: [compileResult],
        totalRuntimeMs: execRes.runtimeMs,
      };
    }

    // 3. If timedOut: this test is failed, actualOutput "(timed out)", continue
    if (execRes.timedOut) {
      timeoutCount++;
      results.push({
        input: test.input,
        expectedOutput: test.expectedOutput,
        actualOutput: "(timed out)",
        passed: false,
        runtimeMs: execRes.runtimeMs,
      });
      continue;
    }

    // 4. If exitCode is non-zero AND stderr.trim() is non-empty: runtime error
    if (execRes.exitCode !== null && execRes.exitCode !== 0 && execRes.stderr.trim().length > 0) {
      runtimeErrorCount++;
      results.push({
        input: test.input,
        expectedOutput: test.expectedOutput,
        actualOutput: execRes.stderr,
        passed: false,
        runtimeMs: execRes.runtimeMs,
      });
      continue;
    }

    // 5. Otherwise: exact string match after trim()
    const isPassed = execRes.stdout.trim() === test.expectedOutput.trim();
    results.push({
      input: test.input,
      expectedOutput: test.expectedOutput,
      actualOutput: execRes.stdout,
      passed: isPassed,
      runtimeMs: execRes.runtimeMs,
    });
  }

  const totalRuntimeMs = results.reduce((sum, r) => sum + r.runtimeMs, 0);

  // Aggregation precedence:
  // - all passed -> "PASSED"
  // - every test timed out -> "TIME_LIMIT_EXCEEDED"
  // - every test was a runtime error -> "RUNTIME_ERROR"
  // - anything else -> "FAILED"
  let overallStatus: SubmissionStatus;

  if (results.every((r) => r.passed)) {
    overallStatus = "PASSED";
  } else if (timeoutCount === results.length) {
    overallStatus = "TIME_LIMIT_EXCEEDED";
  } else if (runtimeErrorCount === results.length) {
    overallStatus = "RUNTIME_ERROR";
  } else {
    overallStatus = "FAILED";
  }

  return {
    overallStatus,
    results,
    totalRuntimeMs,
  };
}
