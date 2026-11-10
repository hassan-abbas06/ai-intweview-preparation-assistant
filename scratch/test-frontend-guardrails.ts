import { getPillarsForRound, FRONTEND_PILLARS, TECHNICAL_PILLARS, InterviewOrchestrator } from "../services/interview-engine";
import { getPersonaForInterview, MAYA_PATEL, ALEX_CHEN } from "../lib/interview/personas";
import { getDiverseFallbackQuestion } from "../lib/interview/question-diversity";
import { buildInterviewState } from "../lib/interview/state";

async function runTests() {
  console.log("=== 1. TESTING getPillarsForRound for Frontend Focus ===");
  const frontendPillars = getPillarsForRound("DOMAIN", "Software_Engineering", "Frontend");
  console.log("Frontend pillars count:", frontendPillars.length);
  console.log("Pillar 0 name:", frontendPillars[0]?.name);
  console.log("Pillar 1 name:", frontendPillars[1]?.name);
  if (frontendPillars[0]?.name !== "Component Architecture, State Management & Reactivity") {
    throw new Error(`Expected Component Architecture, State Management & Reactivity, got: ${frontendPillars[0]?.name}`);
  }
  console.log("PASS: getPillarsForRound correctly returns FRONTEND_PILLARS");

  console.log("\n=== 2. TESTING getPersonaForInterview for Frontend Focus ===");
  const persona = getPersonaForInterview("DOMAIN", "INTERMEDIATE", "Software_Engineering", "Frontend");
  console.log("Selected Persona:", persona.name, "-", persona.role);
  if (persona.name !== "Maya Patel") {
    throw new Error(`Expected Maya Patel, got: ${persona.name}`);
  }
  console.log("PASS: getPersonaForInterview returns Maya Patel for Frontend");

  console.log("\n=== 3. TESTING getDiverseFallbackQuestion for Frontend Focus ===");
  for (let p = 0; p < 5; p++) {
    const q = getDiverseFallbackQuestion(p, frontendPillars[p]?.name, "Software_Engineering", undefined, "DOMAIN", "Frontend");
    console.log(`Pillar ${p} fallback:`, q);
    // Verify it doesn't mention message broker or append-only log or Kafka
    const lower = q.toLowerCase();
    if (lower.includes("append-only log") || lower.includes("message broker queue")) {
      throw new Error(`Leaked backend question into frontend fallback: ${q}`);
    }
  }
  console.log("PASS: getDiverseFallbackQuestion provides authentic frontend questions for all 5 pillars");

  console.log("\n=== 4. TESTING isIntroTurn for 'building website' ===");
  const mockSession = {
    id: "test-session-123",
    userId: "test-user-1",
    type: "DOMAIN" as const,
    domain: "Software_Engineering",
    focusArea: "Frontend",
    difficulty: "INTERMEDIATE",
    status: "IN_PROGRESS" as const,
    messages: [
      {
        id: "msg-1",
        role: "assistant" as const,
        content: "Hey there! Great to meet you. Could you share a bit about your engineering background and what you've been working on recently?",
        createdAt: new Date(),
      },
    ],
  };

  const state = buildInterviewState(mockSession, "building website");
  console.log("isIntroTurn:", state.isIntroTurn);
  console.log("isGreeting:", state.isGreeting);
  console.log("isCandidateEnding:", state.isCandidateEnding);
  if (!state.isIntroTurn) {
    throw new Error("Expected isIntroTurn to be TRUE for 'building website'");
  }
  console.log("PASS: 'building website' is correctly identified as an intro turn");

  console.log("\n=== 5. TESTING InterviewOrchestrator decision on Intro Turn ===");
  const decision = InterviewOrchestrator.decideNextStep({
    state,
    candidateMessage: "building website",
    isOpening: false,
  });
  console.log("Orchestrator Action:", decision.action);
  console.log("Target Pillar:", decision.targetPillarName);
  console.log("Directive Instruction:", decision.directiveInstruction);
  if (decision.action !== "ACKNOWLEDGE_INTRO") {
    throw new Error(`Expected ACKNOWLEDGE_INTRO, got: ${decision.action}`);
  }
  if (decision.targetPillarName !== "Component Architecture, State Management & Reactivity") {
    throw new Error(`Expected Pillar 0 Component Architecture, got: ${decision.targetPillarName}`);
  }
  console.log("PASS: Orchestrator acknowledges intro and directs to Frontend Pillar 0!");

  console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
