import { getCodeExecutionProvider, CodeExecutionUnavailableError } from "./index";
import { ExecutionResult } from "./types";

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

const CONCURRENCY_LIMIT = 3;

function evaluateTestResult(
  test: TestCase,
  execRes: ExecutionResult
): { testResult: TestResult; isTimeout: boolean; isRuntimeError: boolean } {
  // If timedOut: this test is failed, actualOutput "(timed out)"
  if (execRes.timedOut) {
    return {
      testResult: {
        input: test.input,
        expectedOutput: test.expectedOutput,
        actualOutput: "(timed out)",
        passed: false,
        runtimeMs: execRes.runtimeMs,
      },
      isTimeout: true,
      isRuntimeError: false,
    };
  }

  // If exitCode is non-zero AND stderr.trim() is non-empty: runtime error
  if (
    execRes.exitCode !== null &&
    execRes.exitCode !== 0 &&
    execRes.stderr.trim().length > 0
  ) {
    return {
      testResult: {
        input: test.input,
        expectedOutput: test.expectedOutput,
        actualOutput: execRes.stderr,
        passed: false,
        runtimeMs: execRes.runtimeMs,
      },
      isTimeout: false,
      isRuntimeError: true,
    };
  }

  // Otherwise: exact string match after trim()
  const isPassed = execRes.stdout.trim() === test.expectedOutput.trim();
  return {
    testResult: {
      input: test.input,
      expectedOutput: test.expectedOutput,
      actualOutput: execRes.stdout,
      passed: isPassed,
      runtimeMs: execRes.runtimeMs,
    },
    isTimeout: false,
    isRuntimeError: false,
  };
}

export async function runAgainstTests(
  code: string,
  language: string,
  tests: TestCase[],
  timeoutMsPerTest: number = 10000
): Promise<{
  overallStatus: SubmissionStatus;
  results: TestResult[];
  totalRuntimeMs: number;
}> {
  if (!tests || tests.length === 0) {
    throw new Error("No tests provided");
  }

  const provider = getCodeExecutionProvider();

  // 1. COMPILE_ERROR short-circuit: run test 1 alone first
  let firstExecRes: ExecutionResult;
  try {
    firstExecRes = await provider.execute({
      language,
      code,
      stdin: tests[0].input,
      timeoutMs: timeoutMsPerTest,
    });
  } catch (err: unknown) {
    if (err instanceof CodeExecutionUnavailableError) {
      return {
        overallStatus: "PROVIDER_ERROR",
        results: [],
        totalRuntimeMs: 0,
      };
    }
    throw err;
  }

  if (firstExecRes.compileError !== null) {
    const compileResult: TestResult = {
      input: tests[0].input,
      expectedOutput: tests[0].expectedOutput,
      actualOutput: firstExecRes.compileError,
      passed: false,
      runtimeMs: firstExecRes.runtimeMs,
    };
    return {
      overallStatus: "COMPILE_ERROR",
      results: [compileResult],
      totalRuntimeMs: firstExecRes.runtimeMs,
    };
  }

  const rawResults: (ExecutionResult | null)[] = new Array(tests.length).fill(
    null
  );
  rawResults[0] = firstExecRes;

  // 2. Run remaining tests with concurrency limit of 3
  if (tests.length > 1) {
    let nextIndex = 1;
    let providerErrorCaught = false;
    let otherErrorCaught: unknown = null;

    const worker = async () => {
      while (true) {
        if (providerErrorCaught || otherErrorCaught) {
          break;
        }
        const currentIndex = nextIndex++;
        if (currentIndex >= tests.length) {
          break;
        }

        const test = tests[currentIndex];
        try {
          const res = await provider.execute({
            language,
            code,
            stdin: test.input,
            timeoutMs: timeoutMsPerTest,
          });
          rawResults[currentIndex] = res;
        } catch (err: unknown) {
          if (err instanceof CodeExecutionUnavailableError) {
            providerErrorCaught = true;
          } else {
            otherErrorCaught = err;
          }
          break;
        }
      }
    };

    const workerCount = Math.min(CONCURRENCY_LIMIT, tests.length - 1);
    const workers: Promise<void>[] = [];
    for (let w = 0; w < workerCount; w++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    if (otherErrorCaught) {
      throw otherErrorCaught;
    }

    if (providerErrorCaught) {
      const partialResults: TestResult[] = [];
      for (let i = 0; i < tests.length; i++) {
        const res = rawResults[i];
        if (!res) break;
        partialResults.push(evaluateTestResult(tests[i], res).testResult);
      }
      return {
        overallStatus: "PROVIDER_ERROR",
        results: partialResults,
        totalRuntimeMs: partialResults.reduce((sum, r) => sum + r.runtimeMs, 0),
      };
    }
  }

  // 3. Check if any test had a compile error (edge case guard)
  const compileErrorIndex = rawResults.findIndex(
    (res) => res !== null && res.compileError !== null
  );
  if (compileErrorIndex !== -1) {
    const compileRes = rawResults[compileErrorIndex]!;
    const test = tests[compileErrorIndex];
    const compileResult: TestResult = {
      input: test.input,
      expectedOutput: test.expectedOutput,
      actualOutput: compileRes.compileError!,
      passed: false,
      runtimeMs: compileRes.runtimeMs,
    };
    return {
      overallStatus: "COMPILE_ERROR",
      results: [compileResult],
      totalRuntimeMs: compileRes.runtimeMs,
    };
  }

  // 4. Collect results in original order (samples first, then hidden)
  const results: TestResult[] = [];
  let timeoutCount = 0;
  let runtimeErrorCount = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const execRes = rawResults[i]!;
    const evaluated = evaluateTestResult(test, execRes);
    if (evaluated.isTimeout) {
      timeoutCount++;
    } else if (evaluated.isRuntimeError) {
      runtimeErrorCount++;
    }
    results.push(evaluated.testResult);
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
