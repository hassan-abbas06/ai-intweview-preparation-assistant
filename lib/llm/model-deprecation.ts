/**
 * Model deprecation and retirement detection utility.
 *
 * Purpose: Detects when upstream LLM providers (Gemini, Groq) return 404 /
 * decommissioned errors indicating a model has been retired, alerting developers
 * via server logs and Sentry error messages.
 *
 * Free Tier Protection: In-memory module-level deduplication Set<string> ensures
 * each (provider, model) combination is only reported once per runtime lifecycle,
 * protecting free-tier Sentry event quotas from alert storms during fallback loops.
 *
 * Privacy: Reports strictly provider name and truncated model ID. Never attaches
 * error messages, request payloads, transcripts, or stack traces.
 */

import * as Sentry from "@sentry/nextjs";

const reportedModels = new Set<string>();

/**
 * Checks whether an error represents a retired/decommissioned model (404/NOT_FOUND),
 * explicitly distinguishing it from rate limits (429) and auth errors (401/403).
 */
export function isModelRetiredError(err: unknown): boolean {
  try {
    if (!err || (typeof err !== "object" && typeof err !== "function")) {
      return false;
    }

    const anyErr = err as Record<string, any>;
    const status = anyErr.status;
    const statusCode = anyErr.statusCode;
    const code = anyErr.code;
    const errObj =
      anyErr.error && typeof anyErr.error === "object" ? anyErr.error : {};
    const errStatus = errObj.status;
    const errCode = errObj.code;

    // Extract message for pattern matching
    let message = "";
    if (typeof anyErr.message === "string") {
      message = anyErr.message;
    } else if (typeof errObj.message === "string") {
      message = errObj.message;
    }

    // 1. Return FALSE first if any status/code is numeric 429, 401, or 403, or message matches rate limit / quota / auth
    const falseCodes = [429, 401, 403];
    if (
      falseCodes.includes(status) ||
      falseCodes.includes(statusCode) ||
      falseCodes.includes(code) ||
      falseCodes.includes(errStatus) ||
      falseCodes.includes(errCode)
    ) {
      return false;
    }

    const falseMessagePattern =
      /\b429\b|quota|rate.?limit|resource.?exhausted|api.?key/i;
    if (message && falseMessagePattern.test(message)) {
      return false;
    }

    // 2. Return TRUE if any status/code is numeric 404 or string "NOT_FOUND",
    // or code/error.code is "model_not_found" or "model_decommissioned",
    // or message matches model retirement patterns
    if (
      status === 404 ||
      statusCode === 404 ||
      code === 404 ||
      errStatus === 404 ||
      errCode === 404 ||
      status === "NOT_FOUND" ||
      statusCode === "NOT_FOUND" ||
      code === "NOT_FOUND" ||
      errStatus === "NOT_FOUND" ||
      errCode === "NOT_FOUND"
    ) {
      return true;
    }

    if (
      code === "model_not_found" ||
      code === "model_decommissioned" ||
      errCode === "model_not_found" ||
      errCode === "model_decommissioned"
    ) {
      return true;
    }

    const trueMessagePattern =
      /model_not_found|model_decommissioned|decommissioned|is not found for API version/i;
    if (message && trueMessagePattern.test(message)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Logs and alerts Sentry when an LLM model appears to be retired.
 * Deduplicated per (provider, model) in-memory to prevent quota exhaustion.
 */
export function reportModelRetired(
  provider: "Gemini" | "Groq",
  model: string,
  err: unknown
): void {
  try {
    if (!isModelRetiredError(err)) {
      return;
    }

    const truncatedModel =
      typeof model === "string" ? model.slice(0, 100) : "unknown";
    const dedupeKey = `${provider}:${truncatedModel}`;

    if (reportedModels.has(dedupeKey)) {
      return;
    }
    reportedModels.add(dedupeKey);

    console.error(
      `[LLM:ModelDeprecated] ${provider} model ${truncatedModel} appears to be retired — check provider's model list`
    );

    try {
      Sentry.captureMessage(
        `[LLM:ModelDeprecated] ${provider} model ${truncatedModel}`,
        "error"
      );
    } catch {
      // Sentry alert failure must never disrupt application flow
    }
  } catch {
    // Fail-safe wrapper: monitoring must never throw
  }
}
