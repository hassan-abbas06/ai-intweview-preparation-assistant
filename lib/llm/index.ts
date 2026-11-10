import { GeminiProvider } from "./gemini";
import { GroqProvider } from "./groq";
import { MockLLMProvider } from "./mock";
import {
  LLMGenerateOptions,
  LLMProvider,
  LLMStreamOptions,
  extractLLMErrorMessage,
} from "./types";

export * from "./types";
export * from "./gemini";
export * from "./groq";
export * from "./mock";

export class FallbackLLMProvider implements LLMProvider {
  name: string;
  private primary: LLMProvider;
  private fallback?: LLMProvider;

  constructor(primary: LLMProvider, fallback?: LLMProvider) {
    this.primary = primary;
    this.fallback = fallback;
    this.name = fallback ? `${primary.name}->${fallback.name}` : primary.name;
  }

  async generateText(options: LLMGenerateOptions): Promise<string> {
    try {
      return await this.primary.generateText(options);
    } catch (primaryErr: any) {
      const primaryMsg = extractLLMErrorMessage(primaryErr);
      if (this.fallback) {
        console.warn(
          `[LLM Provider Fallback] Primary provider (${this.primary.name}) failed: ${primaryMsg}. Cascading to fallback (${this.fallback.name})...`
        );
        try {
          return await this.fallback.generateText(options);
        } catch (fallbackErr: any) {
          const fallbackMsg = extractLLMErrorMessage(fallbackErr);
          if (process.env.NODE_ENV !== "production") {
            console.error(
              `[LLM Provider Development Fallback] Both primary and fallback failed (${primaryMsg} | ${fallbackMsg}). Serving from MockLLMProvider for local resilience.`
            );
            return await new MockLLMProvider().generateText(options);
          }
          throw new Error(
            `Primary (${this.primary.name}): ${primaryMsg} | Fallback (${this.fallback.name}): ${fallbackMsg}`
          );
        }
      }
      throw new Error(`Provider (${this.primary.name}) failed: ${primaryMsg}`);
    }
  }

  async streamText(options: LLMStreamOptions): Promise<string> {
    try {
      return await this.primary.streamText(options);
    } catch (primaryErr: any) {
      const primaryMsg = extractLLMErrorMessage(primaryErr);
      if (this.fallback) {
        console.warn(
          `[LLM Provider Fallback] Primary provider (${this.primary.name}) stream failed: ${primaryMsg}. Cascading to fallback (${this.fallback.name})...`
        );
        try {
          return await this.fallback.streamText(options);
        } catch (fallbackErr: any) {
          const fallbackMsg = extractLLMErrorMessage(fallbackErr);
          if (process.env.NODE_ENV !== "production") {
            console.error(
              `[LLM Provider Development Fallback] Both primary and fallback stream failed (${primaryMsg} | ${fallbackMsg}). Serving from MockLLMProvider for local resilience.`
            );
            return await new MockLLMProvider().streamText(options);
          }
          throw new Error(
            `Primary (${this.primary.name}): ${primaryMsg} | Fallback (${this.fallback.name}): ${fallbackMsg}`
          );
        }
      }
      throw new Error(`Provider (${this.primary.name}) failed: ${primaryMsg}`);
    }
  }
}

const globalForLLM = globalThis as unknown as {
  cachedLLMProvider?: LLMProvider;
};

/**
 * Returns the configured LLM provider instance per Architecture.md & Rules.md.
 * Provider-agnostic:
 * 1. Honors explicit LLM_PROVIDER="groq" | "gemini" in .env
 * 2. If LLM_PROVIDER is unset / "auto", prefers Groq if GROQ_API_KEY is present for ultra-fast TTFT (~150ms)
 *    and automatically cascades to Gemini if Groq experiences any failure or rate limit.
 * 3. Falls back to Gemini if only GEMINI_API_KEY is present.
 * 4. Falls back to MockLLMProvider if no API keys are provided.
 */
export function getLLMProvider(): LLMProvider {
  if (globalForLLM.cachedLLMProvider) {
    return globalForLLM.cachedLLMProvider;
  }

  const cleanKey = (val?: string): string | undefined => {
    if (!val) return undefined;
    const trimmed = val.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).trim() || undefined;
    }
    return trimmed || undefined;
  };

  const preferredProvider = (process.env.LLM_PROVIDER || "auto").toLowerCase();
  const groqKey = cleanKey(process.env.GROQ_API_KEY);
  const altGroqKey = cleanKey(process.env.ALTERNATIVE_GROQ_API_KEY_1);
  const geminiKey = cleanKey(process.env.GEMINI_API_KEY);
  const altGeminiKey = cleanKey(process.env.ALTERNATIVE_GEMINI_API_KEY_1);

  const groqKeys: string[] = [];
  if (groqKey) groqKeys.push(groqKey);
  if (altGroqKey && altGroqKey !== groqKey) groqKeys.push(altGroqKey);

  const geminiKeys: string[] = [];
  if (geminiKey) geminiKeys.push(geminiKey);
  if (altGeminiKey && altGeminiKey !== geminiKey) geminiKeys.push(altGeminiKey);

  let provider: LLMProvider;

  const groq = groqKeys.length > 0 ? new GroqProvider(groqKeys) : null;
  const gemini = geminiKeys.length > 0 ? new GeminiProvider(geminiKeys) : null;

  if (preferredProvider === "groq" && groq) {
    console.log("[LLM Provider] Explicitly selected Groq as primary LLM engine (with Gemini fallback if available).");
    provider = new FallbackLLMProvider(groq, gemini || undefined);
  } else if (preferredProvider === "gemini" && gemini) {
    console.log("[LLM Provider] Explicitly selected Gemini as primary LLM engine (with Groq fallback if available).");
    provider = new FallbackLLMProvider(gemini, groq || undefined);
  } else if (groq && gemini) {
    console.log("[LLM Provider] Initialized high-resilience LLM engine: Groq (Primary) -> Gemini (Fallback).");
    provider = new FallbackLLMProvider(groq, gemini);
  } else if (groq) {
    console.log("[LLM Provider] Initialized GroqProvider as standalone engine.");
    provider = groq;
  } else if (gemini) {
    console.log("[LLM Provider] Initialized GeminiProvider as standalone engine.");
    provider = gemini;
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error("No LLM provider configured");
    }
    console.warn("[LLM Provider] No API keys detected. Initializing MockLLMProvider for local development.");
    provider = new MockLLMProvider();
  }

  globalForLLM.cachedLLMProvider = provider;
  return provider;
}
