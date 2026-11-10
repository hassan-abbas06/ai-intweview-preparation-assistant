import { LLMGenerateOptions, LLMProvider, LLMStreamOptions } from "./types";
import { isCandidateRequestingToEnd, isGibberish, classifyCandidateMessage } from "../interview/state";

export class MockLLMProvider implements LLMProvider {
  name = "mock";

  async generateText(options: LLMGenerateOptions): Promise<string> {
    const lastUserMessage = [...options.messages]
      .reverse()
      .find((m) => m.role === "user")?.content || "";

    const normalized = lastUserMessage.trim().toLowerCase();

    // 1. Ending / Farewell
    if (isCandidateRequestingToEnd(lastUserMessage)) {
      return "Thank you so much for your time today! It was great speaking with you, and best of luck with your next steps. [SESSION_COMPLETED]";
    }

    // 2. Gibberish / Incomprehensible
    if (isGibberish(lastUserMessage)) {
      return "Sorry, I didn't quite catch that. Could you clarify your answer or walk me through your thoughts on the question?";
    }

    // 3. Asking to ask a question
    if (/^(can|could|may)\s+i\s+(ask|know)|i\s+have\s+a\s+question|quick\s+question/i.test(normalized)) {
      return "Of course, go ahead! What's on your mind?";
    }

    // 4. Greeting
    if (classifyCandidateMessage(lastUserMessage) === "GREETING") {
      return "Hey! Good to have you here. To kick off, could you tell me a bit about your background and what you've been working on recently?";
    }

    // 5. Default conversational interview follow-up
    return `Looking at how you approached that, walk me through how you evaluate the trade-offs between latency and system reliability in that setup.`;
  }

  async streamText(options: LLMStreamOptions): Promise<string> {
    const fullText = await this.generateText(options);
    const words = fullText.split(" ");

    for (const word of words) {
      options.onChunk(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    return fullText;
  }
}
