import { CodeExecutionProvider, ExecutionRequest, ExecutionResult } from "./types";

const PISTON_EXECUTE_URL = "https://emkc.org/api/v2/piston/execute";

const SUPPORTED_LANGUAGES = new Set(["python", "javascript", "java"]);

const MAX_OUTPUT_BYTES = 64 * 1024; // 64KB
const TRUNCATION_MARKER = "\n...[truncated]";

function truncateOutput(str: string): string {
  const buf = Buffer.from(str, "utf-8");
  if (buf.length <= MAX_OUTPUT_BYTES) {
    return str;
  }
  return buf.subarray(0, MAX_OUTPUT_BYTES).toString("utf-8") + TRUNCATION_MARKER;
}

export class PistonProvider implements CodeExecutionProvider {
  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const normalizedLang = req.language.toLowerCase();
    if (!SUPPORTED_LANGUAGES.has(normalizedLang)) {
      throw new Error(
        `Unsupported language: "${req.language}". Supported languages are: ${Array.from(SUPPORTED_LANGUAGES).join(", ")}`
      );
    }

    const abortController = new AbortController();
    const abortTimeout = setTimeout(() => {
      abortController.abort();
    }, req.timeoutMs + 5000);

    const requestBody = {
      language: normalizedLang,
      version: "*",
      files: [{ content: req.code }],
      stdin: req.stdin ?? "",
      run_timeout: req.timeoutMs,
      compile_timeout: 10000,
    };

    const startTime = Date.now();
    let response: Response;
    try {
      response = await fetch(PISTON_EXECUTE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Piston execution request timed out waiting for provider response");
      }
      throw new Error(
        `Failed to reach Piston execution provider: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(abortTimeout);
    }
    const elapsedWallClockMs = Date.now() - startTime;

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {}
      throw new Error(`Piston provider error (HTTP ${response.status}): ${errorBody}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new Error("Piston returned a malformed response: invalid JSON");
    }

    // Compile stage evaluation
    const compile = data.compile;
    const compileFailed =
      compile &&
      ((typeof compile.code === "number" && compile.code !== 0) ||
        (compile.signal !== null && compile.signal !== undefined));

    if (compileFailed) {
      const compileErrRaw =
        compile.stderr ||
        compile.output ||
        "Compilation error";

      return {
        stdout: "",
        stderr: "",
        exitCode: typeof compile.code === "number" && compile.code !== 0 ? compile.code : 1,
        timedOut: false,
        compileError: truncateOutput(compileErrRaw),
        runtimeMs:
          typeof compile.wall_time === "number"
            ? Math.round(compile.wall_time)
            : elapsedWallClockMs,
      };
    }

    const run = data.run;
    if (!run || typeof run !== "object") {
      throw new Error("Piston returned a malformed response: missing run object");
    }

    let stdout = truncateOutput(run.stdout ?? "");
    let stderr = truncateOutput(run.stderr ?? "");
    let exitCode = typeof run.code === "number" ? run.code : null;

    // Check timeout: run.status === "TO" or (run.signal === "SIGKILL" and elapsedWallClockMs >= req.timeoutMs)
    const isTimeout =
      run.status === "TO" ||
      (run.signal === "SIGKILL" && elapsedWallClockMs >= req.timeoutMs);

    if (isTimeout) {
      return {
        stdout,
        stderr,
        exitCode,
        timedOut: true,
        compileError: null,
        runtimeMs:
          typeof run.wall_time === "number" ? Math.round(run.wall_time) : elapsedWallClockMs,
      };
    }

    // If run.status === "SG" or a non-null signal other than the timeout case, treat as runtime error
    const hasSignalOrSG =
      run.status === "SG" || (run.signal !== null && run.signal !== undefined);
    if (hasSignalOrSG) {
      if (exitCode === null || exitCode === 0) {
        exitCode = 1;
      }
      if (!stderr.trim()) {
        stderr = truncateOutput(`Runtime error: signal ${run.signal ?? run.status}`);
      }
    }

    return {
      stdout,
      stderr,
      exitCode,
      timedOut: false,
      compileError: null,
      runtimeMs:
        typeof run.wall_time === "number" ? Math.round(run.wall_time) : elapsedWallClockMs,
    };
  }
}
