import {
  InterviewOrchestrator,
  getPillarsForRound,
  getWeightedPillars,
  scorePillarOverlap,
  JDContext,
  TECHNICAL_PILLARS,
  CYBERSECURITY_PILLARS,
} from "../services/interview-engine";
import { buildInterviewState, InterviewState, InterviewTurnMessage } from "../lib/interview/state";
import { buildSystemPrompt } from "../lib/interview/prompts";
import { InterviewType } from "@prisma/client";

// ANSI colors for clean test reporting
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ${GREEN}✓ PASS:${RESET} ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${RED}✗ FAIL:${RESET} ${testName}`);
    if (detail) console.error(`    ${YELLOW}Detail:${RESET} ${detail}`);
    failedCount++;
  }
}

function simulatePillarSequence(
  type: InterviewType,
  domain: string,
  jdContext?: JDContext | null
): Array<{ index: number; name: string }> {
  const basePillars = getPillarsForRound(type, domain);
  const weighted = getWeightedPillars(basePillars, jdContext);
  return weighted.map((p) => ({ index: p.index, name: p.name }));
}

function buildTestState(priorCompletedSubstantiveAnswers: number): InterviewState {
  const messages: InterviewTurnMessage[] = [
    { role: "assistant", content: "Hi! Welcome. Tell me about your background." },
    { role: "user", content: "I am a software engineer with backend experience." }, // Intro turn
  ];

  for (let i = 0; i < priorCompletedSubstantiveAnswers; i++) {
    messages.push({ role: "assistant", content: `Question ${i + 1} regarding architectural design?` });
    messages.push({ role: "user", content: `Answer ${i + 1}. We implemented microservices with reliable query pipelines.` });
  }

  return buildInterviewState({
    id: "test-session-id",
    userId: "test-user-id",
    type: "DOMAIN",
    domain: "Software_Engineering",
    difficulty: "INTERMEDIATE",
    status: "IN_PROGRESS",
    messages,
  });
}

async function runEngineTests() {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 5: ENGINE JD INTEGRATION TEST SUITE        ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  // ==========================================================================
  // TEST 1: Same track/domain, no JD vs JD with Kafka + PostgreSQL
  // ==========================================================================
  console.log(`${YELLOW}--- Test 1: Pillar Sequence Weighting (Kafka + PostgreSQL) ---${RESET}`);
  const seqNoJd = simulatePillarSequence("DOMAIN", "Software_Engineering", null);
  const jdWithSkills: JDContext = {
    skills: ["Kafka", "PostgreSQL"],
    responsibilities: ["Build streaming pipelines", "Maintain database schemas"],
    seniority: "senior",
  };
  const seqWithJd = simulatePillarSequence("DOMAIN", "Software_Engineering", jdWithSkills);

  console.log("  No-JD Sequence:");
  seqNoJd.forEach((p, i) => console.log(`    [${i}] Pillar ${p.index}: ${p.name}`));

  console.log("\n  JD-Weighted Sequence (Kafka + PostgreSQL):");
  seqWithJd.forEach((p, i) => console.log(`    [${i}] Pillar ${p.index}: ${p.name}`));

  const noJdIndices = seqNoJd.map((p) => p.index);
  const jdIndices = seqWithJd.map((p) => p.index);

  assert(noJdIndices.join(",") === "0,1,2,3,4", "Test 1.1: Default sequence is [0, 1, 2, 3, 4]");
  assert(noJdIndices.join(",") !== jdIndices.join(","), "Test 1.2: JD sequence differs from no-JD sequence");
  // In our scoring: PostgreSQL matches Pillar 1 (Data Modeling), Kafka matches Pillar 3 (Fault Tolerance / Queues)
  assert(jdIndices[0] === 1 || jdIndices[0] === 3, "Test 1.3: JD sequence prioritizes overlapping pillars first (Pillar 1 or 3)");
  assert(seqWithJd.length === seqNoJd.length, "Test 1.4: All original track pillars preserved (no pillars added or dropped)");

  // ==========================================================================
  // TEST 2: JD with Zero Overlap (Finance skills in Cybersecurity track)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 2: Zero Overlap Fallback (Finance in Cybersecurity) ---${RESET}`);
  const cyberNoJd = simulatePillarSequence("DOMAIN", "Cybersecurity", null);
  const financeJd: JDContext = {
    skills: ["DCF Valuation", "WACC", "EBITDA", "LBO Modeling"],
    responsibilities: ["Build financial models", "Perform valuation analysis"],
    seniority: "mid",
  };
  const cyberWithFinanceJd = simulatePillarSequence("DOMAIN", "Cybersecurity", financeJd);

  console.log(`  Cybersecurity without JD: [${cyberNoJd.map((p) => p.index).join(", ")}]`);
  console.log(`  Cybersecurity with Finance JD: [${cyberWithFinanceJd.map((p) => p.index).join(", ")}]`);

  assert(
    cyberNoJd.map((p) => p.index).join(",") === cyberWithFinanceJd.map((p) => p.index).join(","),
    "Test 2.1: Zero-overlap JD produces IDENTICAL sequence to no-JD sequence"
  );

  // ==========================================================================
  // TEST 3: Empty Skills & Null jdContext Identity
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 3: Empty Skills / Null jdContext Identity ---${RESET}`);
  const emptySkillsJd: JDContext = {
    skills: [],
    responsibilities: [],
    seniority: null,
  };
  const seqEmptySkills = simulatePillarSequence("DOMAIN", "Software_Engineering", emptySkillsJd);
  const seqNullJd = simulatePillarSequence("DOMAIN", "Software_Engineering", null);
  const seqUndefinedJd = simulatePillarSequence("DOMAIN", "Software_Engineering", undefined);

  assert(
    seqEmptySkills.map((p) => p.index).join(",") === noJdIndices.join(","),
    "Test 3.1: Empty skills JD produces identical sequence to default"
  );
  assert(
    seqNullJd.map((p) => p.index).join(",") === noJdIndices.join(","),
    "Test 3.2: Null jdContext produces identical sequence to default"
  );
  assert(
    seqUndefinedJd.map((p) => p.index).join(",") === noJdIndices.join(","),
    "Test 3.3: Undefined jdContext produces identical sequence to default"
  );

  // ==========================================================================
  // TEST 4: Turn-Progression Rule Unchanged with JD
  // (Turn 1 Drill Down, Turn 2 Challenge, Turn 3 Advance)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 4: Turn-Progression Invariance with JD ---${RESET}`);
  // Turn 1 on first pillar (0 prior substantive answers after intro):
  const stateTurn1 = buildTestState(0);
  const decTurn1 = InterviewOrchestrator.decideNextStep({
    state: stateTurn1,
    candidateMessage: "I used PostgreSQL with indexed composite keys.",
    jdContext: jdWithSkills,
  });
  console.log(`  Turn 1 Action: ${decTurn1.action} (Reason: ${decTurn1.reasonCode})`);
  assert(decTurn1.action === "DRILL_DOWN", "Test 4.1: Turn 1 is DRILL_DOWN");
  assert(decTurn1.reasonCode === "SUBSTANTIVE_PROBE_DEPTH", "Test 4.2: Reason is SUBSTANTIVE_PROBE_DEPTH");

  // Turn 2 on same pillar (1 prior substantive answer after intro):
  const stateTurn2 = buildTestState(1);
  const decTurn2 = InterviewOrchestrator.decideNextStep({
    state: stateTurn2,
    candidateMessage: "We tuned connection pool size and query plans.",
    jdContext: jdWithSkills,
  });
  console.log(`  Turn 2 Action: ${decTurn2.action} (Reason: ${decTurn2.reasonCode})`);
  assert(decTurn2.action === "CHALLENGE_TRADEOFF", "Test 4.3: Turn 2 is CHALLENGE_TRADEOFF");
  assert(decTurn2.reasonCode === "SUBSTANTIVE_CHALLENGE_TRADEOFF", "Test 4.4: Reason is SUBSTANTIVE_CHALLENGE_TRADEOFF");

  // Turn 3 on same pillar (2 prior substantive answers after intro):
  const stateTurn3 = buildTestState(2);
  const decTurn3 = InterviewOrchestrator.decideNextStep({
    state: stateTurn3,
    candidateMessage: "We added circuit breakers to mitigate downstream degradation.",
    jdContext: jdWithSkills,
  });
  console.log(`  Turn 3 Action: ${decTurn3.action} (Reason: ${decTurn3.reasonCode})`);
  assert(decTurn3.action === "ADVANCE_PILLAR", "Test 4.5: Turn 3 is ADVANCE_PILLAR");
  assert(decTurn3.reasonCode === "PILLAR_PROGRESSION_ADVANCE", "Test 4.6: Reason is PILLAR_PROGRESSION_ADVANCE");

  // ==========================================================================
  // TEST 5: Prompt Flavoring Caller Logic
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 5: Prompt Flavoring Caller Verification ---${RESET}`);
  function assembleCallerPrompt(basePrompt: string, ctx?: JDContext | null): string {
    let prompt = basePrompt;
    if (ctx && ctx.skills && ctx.skills.length > 0) {
      const cappedSkills = ctx.skills.slice(0, 12).join(", ");
      prompt += `\n\nThis candidate is interviewing for a role involving: ${cappedSkills}. Where natural, frame scenario questions around these technologies - but do not force it if the candidate's actual answers go elsewhere.`;
    }
    return prompt;
  }

  const basePrompt = "You are an expert technical interviewer.";

  // 5.1 When skills exist, line is appended
  const p1 = assembleCallerPrompt(basePrompt, jdWithSkills);
  assert(
    p1.includes("This candidate is interviewing for a role involving: Kafka, PostgreSQL."),
    "Test 5.1: Flavoring line appended when skills exist"
  );

  // 5.2 Cap at 12 skills
  const fifteenSkills: JDContext = {
    skills: [
      "Skill01", "Skill02", "Skill03", "Skill04", "Skill05", "Skill06",
      "Skill07", "Skill08", "Skill09", "Skill10", "Skill11", "Skill12",
      "Skill13", "Skill14", "Skill15",
    ],
    responsibilities: [],
    seniority: "senior",
  };
  const p15 = assembleCallerPrompt(basePrompt, fifteenSkills);
  assert(p15.includes("Skill12"), "Test 5.2a: Skill 12 is present");
  assert(!p15.includes("Skill13"), "Test 5.2b: Skill 13 is capped out");
  assert(!p15.includes("Skill14"), "Test 5.2c: Skill 14 is capped out");
  assert(!p15.includes("Skill15"), "Test 5.2d: Skill 15 is capped out");

  // 5.3 When skills empty or null, line does NOT appear
  const pEmpty = assembleCallerPrompt(basePrompt, emptySkillsJd);
  assert(pEmpty === basePrompt, "Test 5.3: Empty skills does NOT append flavoring line");

  const pNull = assembleCallerPrompt(basePrompt, null);
  assert(pNull === basePrompt, "Test 5.4: Null jdContext does NOT append flavoring line");

  // ==========================================================================
  // TEST 6: Aptitude Session Ignores JD
  // ==========================================================================
  console.log(`\n${YELLOW}--- Test 6: Aptitude Path Ignores JD ---${RESET}`);
  function resolveStreamJdContext(sessionType: string, jobDescription: any): JDContext | null {
    if (sessionType !== "APTITUDE" && jobDescription) {
      let skills: string[] = [];
      if (Array.isArray(jobDescription.extractedSkills)) {
        skills = jobDescription.extractedSkills.map(String).filter(Boolean);
      }
      return {
        skills,
        responsibilities: [],
        seniority: jobDescription.extractedSeniority || null,
      };
    }
    return null;
  }

  const mockJdRow = {
    extractedSkills: ["Kafka", "PostgreSQL"],
    extractedSeniority: "senior",
  };

  const domainJd = resolveStreamJdContext("DOMAIN", mockJdRow);
  assert(domainJd !== null && domainJd.skills.length === 2, "Test 6.1: DOMAIN session builds JDContext");

  const aptitudeJd = resolveStreamJdContext("APTITUDE", mockJdRow);
  assert(aptitudeJd === null, "Test 6.2: APTITUDE session ignores JD (returns null JDContext)");

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${BOLD}Engine Test Suite Summary: ${GREEN}${passedCount} Passed${RESET}, ${failedCount > 0 ? RED : GREEN}${failedCount} Failed${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEngineTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
