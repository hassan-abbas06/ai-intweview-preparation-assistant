import { CodeExecutionProvider, ExecutionRequest, ExecutionResult } from "./types";

const RAPIDAPI_BASE_URL = "https://judge0-ce.p.rapidapi.com";
const RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com";
const PUBLIC_BASE_URL = "https://ce.judge0.com";

// Language IDs for public community instance (ce.judge0.com)
const PUBLIC_LANGUAGE_IDS: Record<string, number> = {
  python: 100,    // Python (3.12.5)
  javascript: 97, // JavaScript (Node.js 20.17.0)
  java: 91,       // Java (JDK 17.0.6)
};

// Language IDs for RapidAPI instance
// not verified against RapidAPI's judge0-ce; verify via GET /languages once a key exists
const RAPIDAPI_LANGUAGE_IDS: Record<string, number> = {
  python: 71,     // Python (3.8.1)
  javascript: 63, // JavaScript (Node.js 12.14.0)
  java: 62,       // Java (OpenJDK 13.0.1)
};

const MAX_OUTPUT_BYTES = 64 * 1024; // 64KB
const TRUNCATION_MARKER = "\n...[truncated]";
const MAX_CPU_TIME_LIMIT_SEC = 15;

function encodeBase64(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}

function decodeBase64(str: string | null | undefined): string {
  if (!str) return "";
  return Buffer.from(str, "base64").toString("utf-8");
}

function truncateOutput(str: string): string {
  const buf = Buffer.from(str, "utf-8");
  if (buf.length <= MAX_OUTPUT_BYTES) {
    return str;
  }
  return buf.subarray(0, MAX_OUTPUT_BYTES).toString("utf-8") + TRUNCATION_MARKER;
}

export class Judge0Provider implements CodeExecutionProvider {
  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const apiKey = process.env.JUDGE0_API_KEY?.trim();
    const isRapidApi = Boolean(apiKey && apiKey.length > 0);

    const baseUrl = isRapidApi ? RAPIDAPI_BASE_URL : PUBLIC_BASE_URL;
    const languageMap = isRapidApi ? RAPIDAPI_LANGUAGE_IDS : PUBLIC_LANGUAGE_IDS;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isRapidApi && apiKey) {
      headers["X-RapidAPI-Key"] = apiKey;
      headers["X-RapidAPI-Host"] = RAPIDAPI_HOST;
    }

    const languageId = languageMap[req.language.toLowerCase()];
    if (!languageId) {
      throw new Error(
        `Unsupported language: "${req.language}". Supported languages are: ${Object.keys(languageMap).join(", ")}`
      );
    }

    const cpuTimeLimitSec = Math.min(
      Math.max(1, Math.ceil(req.timeoutMs / 1000)),
      MAX_CPU_TIME_LIMIT_SEC
    );
    const wallTimeLimitSec = Math.min(cpuTimeLimitSec + 2, MAX_CPU_TIME_LIMIT_SEC + 5);

    const abortController = new AbortController();
    const abortTimeout = setTimeout(() => {
      abortController.abort();
    }, req.timeoutMs + 5000);

    const requestBody = {
      language_id: languageId,
      source_code: encodeBase64(req.code),
      stdin: encodeBase64(req.stdin ?? ""),
      cpu_time_limit: cpuTimeLimitSec,
      wall_time_limit: wallTimeLimitSec,
    };

    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/submissions?base64_encoded=true&wait=true&fields=*`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        }
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Judge0 execution request timed out waiting for provider response");
      }
      throw new Error(
        `Failed to reach Judge0 execution provider: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(abortTimeout);
    }

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {}
      throw new Error(`Judge0 provider error (HTTP ${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const statusId = data.status?.id;

    if (typeof statusId !== "number") {
      throw new Error("Judge0 returned a malformed response");
    }

    // Status 13 (Internal Error), 1 (In Queue), 2 (Processing) -> provider failure
    if (statusId === 13 || statusId === 1 || statusId === 2) {
      throw new Error(
        `Judge0 internal/unexpected provider status: ${statusId} (${data.status?.description ?? "Unknown"})`
      );
    }

    const rawStdout = decodeBase64(data.stdout);
    const rawStderr = decodeBase64(data.stderr);
    const rawCompileOutput = decodeBase64(data.compile_output);
    const rawMessage = decodeBase64(data.message);
    const statusDescription = data.status?.description ?? "Unknown runtime error";

    const runtimeMs =
      typeof data.time === "string" || typeof data.time === "number"
        ? Math.round(Number(data.time) * 1000)
        : 0;

    // Status 5: Time Limit Exceeded
    if (statusId === 5) {
      return {
        stdout: truncateOutput(rawStdout),
        stderr: truncateOutput(rawStderr),
        exitCode: typeof data.exit_code === "number" ? data.exit_code : null,
        timedOut: true,
        compileError: null,
        runtimeMs,
      };
    }

    // Status 6: Compilation Error
    if (statusId === 6) {
      const compileErr = rawCompileOutput || rawStderr || "Compilation error";
      return {
        stdout: truncateOutput(rawStdout),
        stderr: truncateOutput(rawStderr),
        exitCode: typeof data.exit_code === "number" ? data.exit_code : 1,
        timedOut: false,
        compileError: truncateOutput(compileErr),
        runtimeMs,
      };
    }

    // Status 7-12, 14: Runtime errors (SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, Runtime Error (Other), Exec Format Error)
    const isRuntimeError = (statusId >= 7 && statusId <= 12) || statusId === 14;
    if (isRuntimeError) {
      let finalStderr = rawStderr.trim()
        ? rawStderr
        : rawMessage.trim()
        ? rawMessage
        : `Runtime error: ${statusDescription}`;
      finalStderr = truncateOutput(finalStderr);

      const finalExitCode =
        typeof data.exit_code === "number" && data.exit_code !== 0
          ? data.exit_code
          : 1;

      return {
        stdout: truncateOutput(rawStdout),
        stderr: finalStderr,
        exitCode: finalExitCode,
        timedOut: false,
        compileError: null,
        runtimeMs,
      };
    }

    // Status 3: Accepted (normal completion)
    return {
      stdout: truncateOutput(rawStdout),
      stderr: truncateOutput(rawStderr),
      exitCode: typeof data.exit_code === "number" ? data.exit_code : null,
      timedOut: false,
      compileError: null,
      runtimeMs,
    };
  }
}
