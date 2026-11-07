import { GoogleGenAI } from "@google/genai";
import {
  LLMGenerateOptions,
  LLMMessage,
  LLMProvider,
  LLMStreamOptions,
  extractLLMErrorMessage,
} from "./types";

const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

const MODEL_TIMEOUT_MS = 10000; // 10s timeout per model attempt

export class GeminiProvider implements LLMProvider {
  name = "gemini";
  private instances: Array<{ ai: GoogleGenAI; label: string }>;

  constructor(apiKeyOrKeys: string | string[]) {
    const keys = Array.isArray(apiKeyOrKeys)
      ? apiKeyOrKeys.filter(Boolean)
      : [apiKeyOrKeys].filter(Boolean);
    this.instances = [];
    for (let i = 0; i < keys.length; i++) {
      this.instances.push({
        ai: new GoogleGenAI({ apiKey: keys[i] }),
        label: i === 0 ? "primary" : `alternative #${i}`,
      });
    }
  }

  private formatContents(messages: LLMMessage[]): {
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    extractedSystem: string;
  } {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    let extractedSystem = "";

    // Retain last 20 messages to prevent context window bloat in long interviews
    const recentMessages = messages.length > 20 ? messages.slice(-20) : messages;

    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      if (msg.role === "system") {
        extractedSystem += (extractedSystem ? "\n\n" : "") + msg.content;
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Ensure at least one user turn exists if contents is empty
    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: "Start the interview." }],
      });
    }

    return { contents, extractedSystem };
  }

  async generateText(options: LLMGenerateOptions): Promise<string> {
    const { contents, extractedSystem } = this.formatContents(options.messages);
    const systemInstruction = options.systemInstruction
      ? `${options.systemInstruction}\n\n${extractedSystem}`.trim()
      : extractedSystem || undefined;

    let lastError: any = null;
    const errorsList: string[] = [];
    const startTime = Date.now();

    for (let k = 0; k < this.instances.length; k++) {
      const instance = this.instances[k];

      for (let m = 0; m < GEMINI_MODELS.length; m++) {
        const model = GEMINI_MODELS[m];
        let timeoutHandle: NodeJS.Timeout | null = null;
        try {
          console.log(`[LLM:Gemini] Requesting completion from ${model} (${instance.label} key, timeout: ${MODEL_TIMEOUT_MS}ms)...`);
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error(`Gemini model ${model} timed out after ${MODEL_TIMEOUT_MS}ms`)),
              MODEL_TIMEOUT_MS
            );
          });

          const completionPromise = instance.ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: options.temperature ?? 0.5,
              maxOutputTokens: options.maxOutputTokens ?? 1024,
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          });

          const response = await Promise.race([completionPromise, timeoutPromise]);
          if (timeoutHandle) clearTimeout(timeoutHandle);

          const text = response.text || "";
          const duration = Date.now() - startTime;
          console.log(
            `[LLM:Gemini Success] Served by ${model} (${instance.label} key) in ${duration}ms (${text.length} chars)`
          );

          if (text) {
            return text;
          }
        } catch (err: any) {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          lastError = err;
          const msg = extractLLMErrorMessage(err);
          errorsList.push(`${model} [${instance.label}]: ${msg}`);
          console.warn(
            `[LLM:Gemini Fallback] Model ${model} on ${instance.label} key failed: ${msg}.`
          );
          if (msg.includes("403") || msg.includes("401") || msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED")) {
            break;
          }
        }
      }

      if (k < this.instances.length - 1) {
        console.warn(`[LLM:Gemini Key Fallback] Primary Gemini API key failed. Cascading to ALTERNATIVE_GEMINI_API_KEY_1...`);
      }
    }

    const detailedError = errorsList.length > 0 ? errorsList.join(" | ") : extractLLMErrorMessage(lastError);
    throw new Error(`Gemini generation failed across all keys and models: ${detailedError}`);
  }

  async streamText(options: LLMStreamOptions): Promise<string> {
    const { contents, extractedSystem } = this.formatContents(options.messages);
    const systemInstruction = options.systemInstruction
      ? `${options.systemInstruction}\n\n${extractedSystem}`.trim()
      : extractedSystem || undefined;

    let lastError: any = null;
    const errorsList: string[] = [];
    const startTime = Date.now();

    for (let k = 0; k < this.instances.length; k++) {
      const instance = this.instances[k];

      for (let m = 0; m < GEMINI_MODELS.length; m++) {
        const model = GEMINI_MODELS[m];
        let timeoutHandle: NodeJS.Timeout | null = null;
        try {
          console.log(`[LLM:Gemini Stream] Starting stream from ${model} (${instance.label} key, TTFT timeout: ${MODEL_TIMEOUT_MS}ms)...`);

          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error(`Gemini stream TTFT for ${model} timed out after ${MODEL_TIMEOUT_MS}ms`)),
              MODEL_TIMEOUT_MS
            );
          });

          const streamPromise = instance.ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: options.temperature ?? 0.5,
              maxOutputTokens: options.maxOutputTokens ?? 1024,
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          });

          const stream = await Promise.race([streamPromise, timeoutPromise]);
          const iterator = stream[Symbol.asyncIterator]();

          // Wait for first chunk to arrive within timeout window
          const firstChunkResult = await Promise.race([iterator.next(), timeoutPromise]);
          if (timeoutHandle) clearTimeout(timeoutHandle);

          options.onMeta?.({ provider: "gemini", model });

          let fullText = "";
          const firstTokenTime = Date.now() - startTime;
          console.log(
            `[LLM:Gemini TTFT] First token from ${model} (${instance.label} key) arrived in ${firstTokenTime}ms`
          );

          let lastFinishReason: string | undefined;
          if (!firstChunkResult.done && firstChunkResult.value) {
            if (firstChunkResult.value.candidates?.[0]?.finishReason) {
              lastFinishReason = firstChunkResult.value.candidates[0].finishReason;
            }
            if (firstChunkResult.value.text) {
              fullText += firstChunkResult.value.text;
              options.onChunk(firstChunkResult.value.text);
            }
          }

          // Stream subsequent tokens to completion
          while (true) {
            const { value, done } = await iterator.next();
            if (done) break;

            if (value?.candidates?.[0]?.finishReason) {
              lastFinishReason = value.candidates[0].finishReason;
            }
            if (value.text) {
              fullText += value.text;
              options.onChunk(value.text);
            }
          }

          const totalTime = Date.now() - startTime;
          console.log(
            `[LLM:Gemini Stream Done] Completed from ${model} (${instance.label} key) in ${totalTime}ms (Total chars: ${fullText.length}, Finish Reason: ${lastFinishReason || 'STOP'})`
          );

          if (fullText.length > 0) {
            return fullText;
          }
        } catch (err: any) {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          lastError = err;
          const msg = extractLLMErrorMessage(err);
          errorsList.push(`${model} [${instance.label}]: ${msg}`);
          console.warn(
            `[LLM:Gemini Stream Fallback] Model ${model} on ${instance.label} key failed: ${msg}.`
          );
          if (msg.includes("403") || msg.includes("401") || msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED")) {
            break;
          }
        }
      }

      if (k < this.instances.length - 1) {
        console.warn(`[LLM:Gemini Stream Key Fallback] Primary Gemini API key failed. Cascading to ALTERNATIVE_GEMINI_API_KEY_1...`);
      }
    }

    const detailedError = errorsList.length > 0 ? errorsList.join(" | ") : extractLLMErrorMessage(lastError);
    throw new Error(`Gemini streaming failed across all keys and models: ${detailedError}`);
  }
}
