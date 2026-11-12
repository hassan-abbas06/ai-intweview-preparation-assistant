import { CodeExecutionProvider, ExecutionRequest, ExecutionResult } from "./types";
import { PistonProvider } from "./piston";
import { Judge0Provider } from "./judge0";

export * from "./types";

export class CodeExecutionUnavailableError extends Error {
  constructor(message: string = "Code execution is temporarily unavailable") {
    super(message);
    this.name = "CodeExecutionUnavailableError";
  }
}

const SUPPORTED_LANGUAGES = new Set(["python", "javascript", "java"]);
const PISTON_AUTH_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes for 401 / 403
const PISTON_DEFAULT_COOLDOWN_MS = 60 * 1000;    // 60 seconds for other errors

let pistonCooldownUntil = 0;

const pistonProvider = new PistonProvider();
const judge0Provider = new Judge0Provider();

function extractSanitizedReason(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    const httpMatch = msg.match(/HTTP\s+(\d{3})/i);
    if (httpMatch) {
      return `HTTP ${httpMatch[1]}`;
    }
    if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out")) {
      return "network/timeout";
    }
  }
  return "network/timeout";
}

function getExecutionProviderMode(): "judge0" | "piston" | "auto" {
  const envMode = process.env.CODE_EXECUTION_PROVIDER?.trim().toLowerCase();
  if (envMode === "auto") {
    return "auto";
  }
  if (envMode === "piston") {
    return "piston";
  }
  return "judge0";
}

class CompositeCodeExecutionProvider implements CodeExecutionProvider {
  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const lang = req.language?.toLowerCase();
    if (!lang || !SUPPORTED_LANGUAGES.has(lang)) {
      throw new Error(
        `Unsupported language: "${req.language}". Supported languages are: ${Array.from(SUPPORTED_LANGUAGES).join(", ")}`
      );
    }

    const mode = getExecutionProviderMode();

    if (mode === "judge0") {
      try {
        return await judge0Provider.execute(req);
      } catch (judge0Err: unknown) {
        const reason = extractSanitizedReason(judge0Err);
        console.error(`[code-execution] Judge0 failed (${reason})`);
        throw new CodeExecutionUnavailableError();
      }
    }

    if (mode === "piston") {
      try {
        return await pistonProvider.execute(req);
      } catch (pistonErr: unknown) {
        const reason = extractSanitizedReason(pistonErr);
        console.error(`[code-execution] Piston failed (${reason})`);
        throw new CodeExecutionUnavailableError();
      }
    }

    // mode === "auto": Piston first with Judge0 fallback
    const now = Date.now();
    const isPistonInCooldown = now < pistonCooldownUntil;

    if (!isPistonInCooldown) {
      try {
        return await pistonProvider.execute(req);
      } catch (pistonErr: unknown) {
        const errMsg = pistonErr instanceof Error ? pistonErr.message : String(pistonErr);
        const isAuthError = errMsg.includes("HTTP 401") || errMsg.includes("HTTP 403");
        const cooldownDuration = isAuthError ? PISTON_AUTH_COOLDOWN_MS : PISTON_DEFAULT_COOLDOWN_MS;
        pistonCooldownUntil = Date.now() + cooldownDuration;

        const reason = extractSanitizedReason(pistonErr);
        console.warn(`[code-execution] Piston unavailable (${reason}), falling back to Judge0`);
      }
    }

    try {
      return await judge0Provider.execute(req);
    } catch (judge0Err: unknown) {
      const reason = extractSanitizedReason(judge0Err);
      console.error(`[code-execution] Judge0 failed (${reason})`);
      throw new CodeExecutionUnavailableError();
    }
  }
}

const compositeProviderInstance = new CompositeCodeExecutionProvider();

export function getCodeExecutionProvider(): CodeExecutionProvider {
  return compositeProviderInstance;
}
