import Groq from "groq-sdk";
import {
  LLMGenerateOptions,
  LLMMessage,
  LLMProvider,
  LLMStreamOptions,
  extractLLMErrorMessage,
} from "./types";

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
];

const MODEL_TIMEOUT_MS = 8000; // 8s timeout per model attempt for fast failover to instant models

export class GroqProvider implements LLMProvider {
  name = "groq";
  private instances: Array<{ client: Groq; label: string }>;

  constructor(apiKeyOrKeys: string | string[]) {
    const keys = Array.isArray(apiKeyOrKeys)
      ? apiKeyOrKeys.filter(Boolean)
      : [apiKeyOrKeys].filter(Boolean);
    this.instances = [];
    for (let i = 0; i < keys.length; i++) {
      this.instances.push({
        client: new Groq({ apiKey: keys[i] }),
        label: i === 0 ? "primary" : `alternative #${i}`,
      });
    }
  }

  private formatMessages(
    messages: LLMMessage[],
    systemInstruction?: string
  ): Array<{ role: "system" | "user" | "assistant"; content: string }> {
    const formatted: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [];

    if (systemInstruction) {
      formatted.push({ role: "system", content: systemInstruction });
    }

    // Retain last 20 messages to prevent context window overflow in long interviews
    const recentMessages = messages.length > 20 ? messages.slice(-20) : messages;

    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      formatted.push({ role: msg.role, content: msg.content });
    }

    return formatted;
  }

  async generateText(options: LLMGenerateOptions): Promise<string> {
    const messages = this.formatMessages(
      options.messages,
      options.systemInstruction
    );
    let lastError: any = null;
    const errorsList: string[] = [];
    const startTime = Date.now();

    for (let k = 0; k < this.instances.length; k++) {
      const instance = this.instances[k];

      for (let m = 0; m < GROQ_MODELS.length; m++) {
        const model = GROQ_MODELS[m];
        let timeoutHandle: NodeJS.Timeout | null = null;
        try {
          console.log(`[LLM:Groq] Requesting completion from ${model} (${instance.label} key, timeout: ${MODEL_TIMEOUT_MS}ms)...`);
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error(`Groq model ${model} timed out after ${MODEL_TIMEOUT_MS}ms`)),
              MODEL_TIMEOUT_MS
            );
          });

          const completionPromise = instance.client.chat.completions.create({
            model,
            messages,
            temperature: options.temperature ?? 0.5,
            max_tokens: options.maxOutputTokens ?? 200,
          });

          const completion = await Promise.race([completionPromise, timeoutPromise]);
          if (timeoutHandle) clearTimeout(timeoutHandle);

          const text = completion.choices[0]?.message?.content || "";
          const duration = Date.now() - startTime;
          console.log(
            `[LLM:Groq Success] Served by ${model} (${instance.label} key) in ${duration}ms (${text.length} chars)`
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
            `[LLM:Groq Fallback] Model ${model} on ${instance.label} key failed: ${msg}.`
          );
          if (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("403")) {
            break;
          }
        }
      }

      if (k < this.instances.length - 1) {
        console.warn(`[LLM:Groq Key Fallback] Primary Groq API key failed. Cascading to ALTERNATIVE_GROQ_API_KEY_1...`);
      }
    }

    const detailedError = errorsList.length > 0 ? errorsList.join(" | ") : extractLLMErrorMessage(lastError);
    throw new Error(`Groq generation failed across all keys and models: ${detailedError}`);
  }

  async streamText(options: LLMStreamOptions): Promise<string> {
    const messages = this.formatMessages(
      options.messages,
      options.systemInstruction
    );
    let lastError: any = null;
    const errorsList: string[] = [];
    const startTime = Date.now();

    for (let k = 0; k < this.instances.length; k++) {
      const instance = this.instances[k];

      for (let m = 0; m < GROQ_MODELS.length; m++) {
        const model = GROQ_MODELS[m];
        let timeoutHandle: NodeJS.Timeout | null = null;
        try {
          console.log(`[LLM:Groq Stream] Starting stream from ${model} (${instance.label} key, TTFT timeout: ${MODEL_TIMEOUT_MS}ms)...`);

          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error(`Groq stream TTFT for ${model} timed out after ${MODEL_TIMEOUT_MS}ms`)),
              MODEL_TIMEOUT_MS
            );
          });

          const streamPromise = instance.client.chat.completions.create({
            model,
            messages,
            temperature: options.temperature ?? 0.5,
            max_tokens: options.maxOutputTokens ?? 200,
            stream: true,
          });

          const stream = await Promise.race([streamPromise, timeoutPromise]);
          const iterator = stream[Symbol.asyncIterator]();

          // Wait for first chunk to arrive within timeout window
          const firstChunkResult = await Promise.race([iterator.next(), timeoutPromise]);
          if (timeoutHandle) clearTimeout(timeoutHandle);

          options.onMeta?.({ provider: "groq", model });

          let fullText = "";
          const firstTokenTime = Date.now() - startTime;
          console.log(
            `[LLM:Groq TTFT] First token from ${model} (${instance.label} key) arrived in ${firstTokenTime}ms`
          );

          if (!firstChunkResult.done && firstChunkResult.value) {
            const firstDelta = firstChunkResult.value.choices[0]?.delta?.content || "";
            if (firstDelta) {
              fullText += firstDelta;
              options.onChunk(firstDelta);
            }
          }

          // Stream subsequent tokens to completion
          while (true) {
            const { value, done } = await iterator.next();
            if (done) break;

            const delta = value.choices[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              options.onChunk(delta);
            }
          }

          const totalTime = Date.now() - startTime;
          console.log(
            `[LLM:Groq Stream Done] Completed from ${model} (${instance.label} key) in ${totalTime}ms (Total chars: ${fullText.length})`
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
            `[LLM:Groq Stream Fallback] Model ${model} on ${instance.label} key failed: ${msg}.`
          );
          if (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("403")) {
            break;
          }
        }
      }

      if (k < this.instances.length - 1) {
        console.warn(`[LLM:Groq Stream Key Fallback] Primary Groq API key failed. Cascading to ALTERNATIVE_GROQ_API_KEY_1...`);
      }
    }

    const detailedError = errorsList.length > 0 ? errorsList.join(" | ") : extractLLMErrorMessage(lastError);
    throw new Error(`Groq streaming failed across all keys and models: ${detailedError}`);
  }
}
