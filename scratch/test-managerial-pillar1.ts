import fs from "fs";
import { GroqProvider } from "../lib/llm/groq";
import { buildSystemPrompt } from "../lib/interview/prompts";
import { InterviewOrchestrator } from "../services/interview-engine";
import { InterviewState } from "../lib/interview/state";
import assert from "assert";

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

async function testOpeningAndPillar1() {
  const realAltGroq = getClean("ALTERNATIVE_GROQ_API_KEY_1") || getClean("GROQ_API_KEY");
  const groq = new GroqProvider([realAltGroq]);

  const mockState: InterviewState = {
    sessionId: "live-test-mgr-pillar1",
    userId: "test-user",
    type: "MANAGERIAL",
    difficulty: "MID",
    domain: "Software_Engineering",
    focusArea: null,
    modality: "TEXT",
    status: "IN_PROGRESS",
    questionNumber: 1,
    messages: [
      { id: "1", role: "assistant", content: "Hey, thanks for hopping on — I'm Jordan from engineering leadership. Before we jump into things, tell me a bit about your journey and what you've been focusing on recently." },
      { id: "2", role: "user", content: "I've been working as an engineering manager for 4 years leading a backend platform team using Go, Kubernetes, and PostgreSQL." },
    ],
    askedQuestions: [],
    topicsCovered: [],
    nonSubstantiveCount: 0,
    isGreeting: false,
    isIntroTurn: true,
    isCandidateEnding: false,
    isCandidateVulgar: false,
    crossSessionAskedQuestions: [],
    candidateMemory: {
      experienceHighlights: ["4 years EM leading backend team"],
      skillsAndTechnologies: ["Go", "Kubernetes", "PostgreSQL"],
      projectsAndArchitectures: [],
    },
  };

  const jdContext = {
    skills: ["Go", "Kubernetes", "PostgreSQL", "Kafka", "Distributed Systems"],
    responsibilities: ["Lead engineering team", "Manage sprint delivery", "Hire engineers"],
    seniority: "Engineering Manager",
  };

  const decision = InterviewOrchestrator.decideNextStep({
    state: mockState,
    candidateMessage: mockState.messages[1].content,
    jdContext,
  });

  let systemPrompt = buildSystemPrompt({
    state: mockState,
    decision,
  });

  // Apply the route.ts JD context gating
  if (jdContext && jdContext.skills && jdContext.skills.length > 0) {
    if (mockState.type === "MANAGERIAL") {
      const cappedSkills = jdContext.skills.slice(0, 8).join(", ");
      systemPrompt += `\n\nThis candidate is interviewing for an Engineering Management / Leadership role where teams work with: ${cappedSkills}. Focus strictly on engineering leadership, tech debt vs delivery tradeoffs, roadmap prioritization, team topology, hiring calibration, and people coaching. NEVER quiz the candidate on programming language syntax, data structures, coding trivia, or individual contributor implementation details.`;
    }
  }

  console.log("=== CALLING GROQ LIVE FOR MANAGERIAL PILLAR 1 QUESTION ===");
  const historyMessages = [
    { role: "assistant" as const, content: mockState.messages[0].content },
    { role: "user" as const, content: mockState.messages[1].content },
  ];

  const response = await groq.generateText({
    messages: historyMessages,
    systemInstruction: systemPrompt,
    temperature: 0.5,
    maxOutputTokens: 200,
  });

  console.log("\n=== LIVE LLM (Jordan Williams) FIRST PILLAR QUESTION ===");
  console.log(response);

  // Assertions: Must be leadership, must not quiz on slice/array or syntax
  assert.ok(
    !response.toLowerCase().includes("difference between a slice and an array") &&
    !response.toLowerCase().includes("syntax") &&
    !response.toLowerCase().includes("junior dev"),
    "Response must not ask syntax or frame candidate as junior!"
  );
  console.log("\n✅ Managerial opening question is genuine engineering leadership!");
}

testOpeningAndPillar1().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
