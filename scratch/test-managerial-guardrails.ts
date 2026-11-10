import assert from "assert";
import {
  isCandidateTrackClarification,
  InterviewOrchestrator,
} from "../services/interview-engine";
import {
  InterviewState,
} from "../lib/interview/state";
import {
  buildSystemPrompt,
  getDifficultyDepthInstruction,
} from "../lib/interview/prompts";
import {
  getScenarioDiversificationGuidelines,
  getDiverseFallbackQuestion,
} from "../lib/interview/question-diversity";
import { InterviewEvaluator } from "../services/evaluator";

async function runTests() {
  console.log("=== 1. TESTING isCandidateTrackClarification ===");

  const testPhrases = [
    "this is managerial leadership round then why are u asking me the tech questions??",
    "why are u asking me the tech questions??",
    "why are you asking tech questions this is a leadership round",
    "this is HR round why coding?",
    "isn't this a managerial round?",
    "why are we talking about golang?",
    "why tech questions?",
    "i thought this was a managerial round",
  ];

  for (const phrase of testPhrases) {
    const matched = isCandidateTrackClarification(phrase);
    console.log(`[Track Clarification Test] "${phrase}" -> ${matched}`);
    assert.strictEqual(matched, true, `Expected "${phrase}" to be recognized as track clarification`);
  }

  // Ensure normal answers are NOT false-positively flagged
  const normalAnswers = [
    "In our last quarterly roadmap, we balanced tech debt by dedicating 20% of engineering bandwidth.",
    "I usually conduct weekly 1-on-1s with each engineer to identify burnout early.",
    "We use Kafka for event-driven messaging between our payment service and accounting ledger.",
  ];
  for (const phrase of normalAnswers) {
    const matched = isCandidateTrackClarification(phrase);
    assert.strictEqual(matched, false, `Expected normal answer "${phrase}" NOT to match track clarification`);
  }
  console.log("✅ All track clarification regex tests passed!");

  console.log("\n=== 2. TESTING InterviewOrchestrator.decideNextStep for Track Challenge ===");
  const mockState: InterviewState = {
    sessionId: "mock-session-id",
    userId: "mock-user-id",
    type: "MANAGERIAL",
    difficulty: "MID",
    domain: "Software_Engineering",
    focusArea: null,
    modality: "TEXT",
    status: "IN_PROGRESS",
    questionNumber: 2,
    messages: [
      { id: "1", role: "assistant", content: "Hey, I'm Jordan. Tell me about your background." },
      { id: "2", role: "user", content: "I have 8 years leading backend and infrastructure teams." },
      { id: "3", role: "assistant", content: "In Go, what's the main difference between a slice and an array?" },
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
      experienceHighlights: [],
      skillsAndTechnologies: [],
      projectsAndArchitectures: [],
    },
  };

  const decision = InterviewOrchestrator.decideNextStep({
    state: mockState,
    candidateMessage: "this is managerial leadership round then why are u asking me the tech questions??",
  });

  console.log("Decision Action:", decision.action);
  console.log("Decision Reason:", decision.reasonCode);
  console.log("Directive snippet:", decision.directiveInstruction.slice(0, 150) + "...");

  assert.strictEqual(decision.action, "ANSWER_TRACK_CLARIFICATION");
  assert.strictEqual(decision.reasonCode, "CANDIDATE_CHALLENGED_ROUND_TYPE");
  assert.ok(decision.directiveInstruction.includes("apologies"));
  assert.ok(decision.directiveInstruction.includes("NEVER quiz the candidate on coding"));
  assert.ok(decision.directiveInstruction.includes("NEVER frame the candidate as a junior developer"));
  console.log("✅ Orchestrator correctly intercepted track challenge!");

  console.log("\n=== 3. TESTING getDifficultyDepthInstruction for MANAGERIAL ===");
  const juniorMgrDepth = getDifficultyDepthInstruction("JUNIOR", undefined, "MANAGERIAL");
  console.log("Junior Mgr Depth:", juniorMgrDepth);
  assert.ok(!juniorMgrDepth.includes("fundamental syntax"), "Must NOT instruct to verify syntax for junior manager!");
  assert.ok(juniorMgrDepth.includes("NEVER quiz on programming syntax"), "Must prohibit syntax");
  assert.ok(juniorMgrDepth.includes("NEVER frame the candidate as a junior developer"), "Must prohibit junior framing");
  console.log("✅ getDifficultyDepthInstruction for MANAGERIAL verified!");

  console.log("\n=== 4. TESTING getScenarioDiversificationGuidelines for MANAGERIAL ===");
  const mgrGuidelines = getScenarioDiversificationGuidelines(0, "Strategic Roadmapping", "Software_Engineering", "MID", "MANAGERIAL");
  console.log("Managerial Scenario Guidelines:\n", mgrGuidelines);
  assert.ok(mgrGuidelines.includes("MANAGERIAL LEADERSHIP ROUND"));
  assert.ok(mgrGuidelines.includes("Tech Debt vs Product Deadline"));
  assert.ok(!mgrGuidelines.includes("legacy service is dropping requests under 10x traffic"));
  console.log("✅ Managerial Scenario Diversification Guidelines verified!");

  console.log("\n=== 5. TESTING getDiverseFallbackQuestion for MANAGERIAL ===");
  const fallbackQ = getDiverseFallbackQuestion(0, "Strategic Roadmapping", "Software_Engineering", undefined, "MANAGERIAL");
  console.log("Managerial Fallback Question:", fallbackQ);
  const isLeadershipQuestion = [
    "technical debt",
    "engineering capacity",
    "roadmap",
    "feature release",
    "non-technical leadership",
    "leadership",
    "stakeholders",
  ].some((kw) => fallbackQ.toLowerCase().includes(kw));
  assert.ok(
    isLeadershipQuestion,
    "Fallback question must be leadership/management focused"
  );
  assert.ok(!fallbackQ.includes("telemetry agent"), "Must NOT be distributed telemetry fallback");
  console.log("✅ Managerial Fallback Question verified!");

  console.log("\n=== 6. TESTING Fast-Path Bypass for Track Clarification in Evaluator ===");
  const isBypassed = InterviewEvaluator.isFastPathBypass(
    "this is managerial leadership round then why are u asking me the tech questions??",
    mockState
  );
  console.log("Fast-Path Bypass Result:", isBypassed);
  assert.strictEqual(isBypassed, true, "Track challenge must bypass scoring so candidate score is not penalized!");
  console.log("✅ Evaluator Fast-Path Bypass verified!");

  console.log("\n=== 7. TESTING buildSystemPrompt contains Track & Seniority Fidelity Rule ===");
  const prompt = buildSystemPrompt({
    state: mockState,
    decision,
  });
  assert.ok(prompt.includes("STRICT TRACK & DOMAIN FIDELITY (MANDATORY)"));
  assert.ok(prompt.includes("ABSOLUTE PROHIBITION ON SYNTAX & CODING"));
  assert.ok(prompt.includes("ABSOLUTE PROHIBITION ON JUNIOR FRAMING"));
  assert.ok(prompt.includes("NEVER frame the candidate as a junior developer"));
  console.log("✅ System prompt includes strict track & seniority fidelity rules!");

  console.log("\n🎉 ALL 7 GUARANTEES PASSED WITH FLYING COLORS!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
