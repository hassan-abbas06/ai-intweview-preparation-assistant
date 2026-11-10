import fs from "fs";
import { GroqProvider } from "../lib/llm/groq";
import { buildSystemPrompt } from "../lib/interview/prompts";
import { InterviewOrchestrator } from "../services/interview-engine";
import { InterviewState } from "../lib/interview/state";

const env = fs.readFileSync(".env", "utf8");
function getClean(name: string): string {
  const m = env.match(new RegExp("^" + name + "=(.*)$", "m"));
  if (!m) return "";
  let val = m[1].trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

async function testLiveGeneration() {
  const realAltGroq = getClean("ALTERNATIVE_GROQ_API_KEY_1") || getClean("GROQ_API_KEY");
  const groq = new GroqProvider([realAltGroq]);

  const mockState: InterviewState = {
    sessionId: "live-test-mgr",
    userId: "test-user",
    type: "MANAGERIAL",
    difficulty: "MID",
    domain: "Software_Engineering",
    focusArea: null,
    modality: "TEXT",
    status: "IN_PROGRESS",
    questionNumber: 2,
    messages: [
      { id: "1", role: "assistant", content: "Hey, I'm Jordan from engineering leadership. Before we jump into things, tell me a bit about your journey and what you've been focusing on recently." },
      { id: "2", role: "user", content: "I've been leading an engineering squad of 8 backend engineers building high-scale services." },
      { id: "3", role: "assistant", content: "In Go, what's the main difference between a slice and an array, and why would you choose one over the other when passing data to a function?" },
    ],
    askedQuestions: ["In Go, what's the main difference between a slice and an array?"],
    topicsCovered: [],
    nonSubstantiveCount: 0,
    isGreeting: false,
    isIntroTurn: false,
    isCandidateEnding: false,
    isCandidateVulgar: false,
    crossSessionAskedQuestions: [],
    candidateMemory: {
      experienceHighlights: ["leading squad of 8 backend engineers"],
      skillsAndTechnologies: ["Go", "backend"],
      projectsAndArchitectures: [],
    },
  };

  const candidateMessage = "this is managerial leadership round then why are u asking me the tech questions??";
  const decision = InterviewOrchestrator.decideNextStep({
    state: mockState,
    candidateMessage,
  });

  const systemPrompt = buildSystemPrompt({
    state: mockState,
    decision,
  });

  console.log("=== CALLING GROQ LIVE WITH MANAGERIAL TRACK CLARIFICATION DIRECTIVE ===");
  const historyMessages = [
    { role: "assistant" as const, content: mockState.messages[0].content },
    { role: "user" as const, content: mockState.messages[1].content },
    { role: "assistant" as const, content: mockState.messages[2].content },
    { role: "user" as const, content: candidateMessage },
  ];

  const response = await groq.generateText({
    messages: historyMessages,
    systemInstruction: systemPrompt,
    temperature: 0.5,
    maxOutputTokens: 200,
  });

  console.log("\n=== LIVE LLM (Jordan Williams) RESPONSE ===");
  console.log(response);

  // Assertions on response
  assert.ok(
    !response.toLowerCase().includes("junior dev") &&
    !response.toLowerCase().includes("junior engineer"),
    "Response must NEVER frame candidate as junior!"
  );
  assert.ok(
    !response.toLowerCase().includes("slice and an array") &&
    !response.toLowerCase().includes("golang syntax"),
    "Response must NEVER ask programming syntax!"
  );
  console.log("\n✅ Response successfully adheres to Managerial Leadership requirements!");
}

import assert from "assert";
testLiveGeneration().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
