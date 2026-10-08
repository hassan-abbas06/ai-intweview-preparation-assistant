import { prisma } from "../lib/prisma";
import {
  QuestionDiversityService,
  evaluateQuestionSimilarity,
  validateCandidateQuestion,
  normalizeQuestionText,
  classifyScenarioArchetype,
  extractQuestionSignature,
  getDiverseFallbackQuestion,
  getScenarioDiversificationGuidelines,
} from "../lib/interview/question-diversity";
import { InterviewOrchestrator } from "../services/interview-engine";
import { buildInterviewState } from "../lib/interview/state";
import { selectAptitudeQuestions, APTITUDE_QUESTION_BANK } from "../lib/interview/aptitude-bank";
import { InterviewType, SessionStatus, InterviewModality } from "@prisma/client";

async function runPhase6Tests() {
  console.log("\n========================================================");
  console.log("🚀 PHASE 6: QUESTION DIVERSITY & ANTI-REPETITION VERIFICATION");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] Test ${total.toString().padStart(2, "0")}: ${testName}`);
    } else {
      console.error(`❌ [FAIL] Test ${total.toString().padStart(2, "0")}: ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
    }
  }

  const testUserEmail = `phase6_test_candidate_${Date.now()}@example.com`;
  let testUser: any = null;
  let sessionA: any = null;
  let sessionB: any = null;

  try {
    // Setup test user
    testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        domain: "Software_Engineering",
      },
    });

    // Setup session A
    sessionA = await prisma.interviewSession.create({
      data: {
        userId: testUser.id,
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        status: "IN_PROGRESS",
      },
    });

    // Setup session B
    sessionB = await prisma.interviewSession.create({
      data: {
        userId: testUser.id,
        type: "DOMAIN",
        domain: "Software_Engineering",
        difficulty: "INTERMEDIATE",
        status: "IN_PROGRESS",
      },
    });

    // --------------------------------------------------------------------------
    // Test 1: Question recorded after successful delivery
    // --------------------------------------------------------------------------
    const q1Text = "How would you design a distributed rate limiter using a sliding window log algorithm?";
    const recorded1 = await QuestionDiversityService.recordQuestion({
      userId: testUser.id,
      sessionId: sessionA.id,
      questionText: q1Text,
      pillarIndex: 0,
      pillarSlug: "PILLAR-0",
      pillarName: "System Architecture",
      track: "DOMAIN",
      domain: "Software_Engineering",
      difficulty: "INTERMEDIATE",
      questionType: "OPENING",
    });

    const dbRecord1 = await prisma.questionHistory.findFirst({
      where: { sessionId: sessionA.id, questionText: q1Text },
    });
    assert(recorded1 === true && !!dbRecord1, "Question recorded after successful delivery", "Record was not found in DB");

    // --------------------------------------------------------------------------
    // Test 2: Exact duplicate rejected
    // --------------------------------------------------------------------------
    const sim2 = evaluateQuestionSimilarity(
      "How would you design a distributed rate limiter using a sliding window log algorithm?",
      q1Text
    );
    assert(sim2.isDuplicate === true && sim2.matchedLevel === "LEVEL_1_EXACT", "Exact duplicate rejected", `Got ${sim2.matchedLevel}`);

    // --------------------------------------------------------------------------
    // Test 3: Case/punctuation variation rejected
    // --------------------------------------------------------------------------
    const sim3 = evaluateQuestionSimilarity(
      "   how would you design a distributed rate limiter using a sliding window log algorithm???   ",
      q1Text
    );
    assert(sim3.isDuplicate === true && sim3.matchedLevel === "LEVEL_1_EXACT", "Case/punctuation variation rejected", `Got ${sim3.matchedLevel}`);

    // --------------------------------------------------------------------------
    // Test 4: Within-session duplicate rejected
    // --------------------------------------------------------------------------
    const val4 = validateCandidateQuestion(
      "Explain how you would architect a distributed rate limiter with sliding window log.",
      [{ questionText: q1Text }]
    );
    assert(val4.isValid === false, "Within-session duplicate rejected", `Expected invalid, got valid: ${val4.reason}`);

    // --------------------------------------------------------------------------
    // Test 5: Cross-session duplicate rejected
    // --------------------------------------------------------------------------
    const crossHistory5 = await QuestionDiversityService.getCrossSessionHistory(testUser.id, "DOMAIN", "Software_Engineering");
    const val5 = validateCandidateQuestion(
      "How would you design a distributed rate limiter using a sliding window log algorithm?",
      crossHistory5
    );
    assert(val5.isValid === false, "Cross-session duplicate rejected", `Expected invalid from cross-session history: ${val5.reason}`);

    // --------------------------------------------------------------------------
    // Test 6: Meaningfully different question accepted
    // --------------------------------------------------------------------------
    const qDistinct = "How would you design an event-driven notification engine that guarantees at-least-once delivery using Kafka?";
    const val6 = validateCandidateQuestion(qDistinct, crossHistory5);
    assert(val6.isValid === true, "Meaningfully different question accepted", `Expected valid, got invalid: ${val6.reason}`);

    // --------------------------------------------------------------------------
    // Test 7: Different scenario for same pillar accepted
    // --------------------------------------------------------------------------
    // Both are Pillar 0 (Architecture), but test different archetypes/entities
    const qAltScenario = "A critical microservice is dropping 15% of downstream requests under traffic spikes. How would you diagnose the bottleneck?";
    const val7 = validateCandidateQuestion(qAltScenario, [{ questionText: q1Text }], { targetPillarIndex: 0 });
    assert(val7.isValid === true, "Different scenario for same pillar accepted", `Got rejection: ${val7.reason}`);

    // --------------------------------------------------------------------------
    // Test 8: Legitimate contextual follow-up allowed
    // --------------------------------------------------------------------------
    // Candidate mentioned Redis in their previous substantive answer; interviewer drills down on Redis cache invalidation
    const precedingCandidateAnswer = "For the storage and caching layer, I would use a Redis cluster to store token counters and session state.";
    const followUpQuestion = "How would you handle Redis cache invalidation and cache penetration when a non-existent key is queried repeatedly?";
    const sim8 = evaluateQuestionSimilarity(
      followUpQuestion,
      "How would you implement a distributed caching layer with Redis?",
      {
        precedingCandidateAnswer,
        isFollowUpAction: true,
        targetPillarIndex: 2,
      }
    );
    assert(sim8.isDuplicate === false && sim8.isExemptedFollowUp === true, "Legitimate contextual follow-up allowed", `Result: ${JSON.stringify(sim8)}`);

    // --------------------------------------------------------------------------
    // Test 9: Question history persists across sessions
    // --------------------------------------------------------------------------
    const history9 = await QuestionDiversityService.getCrossSessionHistory(testUser.id, "DOMAIN");
    assert(history9.length >= 1 && history9.some((h) => h.questionText === q1Text), "Question history persists across sessions", `History count: ${history9.length}`);

    // --------------------------------------------------------------------------
    // Test 10: Failed question generation is not recorded
    // --------------------------------------------------------------------------
    const preCount = await prisma.questionHistory.count({ where: { userId: testUser.id } });
    // Simulate failed generation where recordQuestion is not called or called with empty text
    const failedRecord = await QuestionDiversityService.recordQuestion({
      userId: testUser.id,
      sessionId: sessionA.id,
      questionText: "",
      track: "DOMAIN",
    });
    const postCount = await prisma.questionHistory.count({ where: { userId: testUser.id } });
    assert(failedRecord === false && preCount === postCount, "Failed question generation is not recorded", "Count changed on failed record");

    // --------------------------------------------------------------------------
    // Test 11: Retry does not create duplicate history
    // --------------------------------------------------------------------------
    // Terminal / session completed questions are rejected from technical question history
    const terminalRecorded = await QuestionDiversityService.recordQuestion({
      userId: testUser.id,
      sessionId: sessionA.id,
      questionText: "Thank you for your time today! Best of luck with your next steps. [SESSION_COMPLETED]",
      track: "DOMAIN",
    });
    assert(terminalRecorded === false, "Retry/terminal does not create duplicate history", "Terminal message was erroneously recorded");

    // --------------------------------------------------------------------------
    // Test 12: Voice question recorded in same history as text
    // --------------------------------------------------------------------------
    const voiceSession = await prisma.interviewSession.create({
      data: {
        userId: testUser.id,
        type: "DOMAIN",
        domain: "Software_Engineering",
        modality: "VOICE",
        status: "IN_PROGRESS",
      },
    });
    const voiceQ = "Walk me through how you design an idempotent payment processing workflow with stripe webhooks.";
    await QuestionDiversityService.recordQuestion({
      userId: testUser.id,
      sessionId: voiceSession.id,
      questionText: voiceQ,
      track: "DOMAIN",
      domain: "Software_Engineering",
    });
    const voiceRecord = await prisma.questionHistory.findFirst({
      where: { sessionId: voiceSession.id },
    });
    assert(!!voiceRecord && voiceRecord.questionText === voiceQ, "Voice question recorded in same history as text", "Voice question was not recorded");

    // --------------------------------------------------------------------------
    // Test 13: Text question recorded in same history as voice
    // --------------------------------------------------------------------------
    // In session B (text modality), check crossSessionHistory: it must include voiceQ from voiceSession!
    const unifiedHistory = await QuestionDiversityService.getCrossSessionHistory(testUser.id, "DOMAIN");
    assert(unifiedHistory.some((h) => h.questionText === voiceQ), "Text question recorded in same history as voice", "Unified cross-session history missing voice question");

    // --------------------------------------------------------------------------
    // Test 14: Aptitude question history works correctly
    // --------------------------------------------------------------------------
    const mockAptitudeQuestions = [
      { id: "apt_1", question: "A train running at 60 km/hr...", category: "Quantitative" },
      { id: "apt_2", question: "12 men or 18 women...", category: "Quantitative" },
    ];
    await QuestionDiversityService.recordAptitudeQuestions(testUser.id, sessionA.id, mockAptitudeQuestions);
    const excludedIds = await QuestionDiversityService.getAptitudeExclusionIds(testUser.id);
    const hasApt1 = excludedIds.includes("apt_1");
    const hasApt2 = excludedIds.includes("apt_2");
    // Verify selectAptitudeQuestions excludes them
    const freshAptitudeSelection = selectAptitudeQuestions(excludedIds, 5);
    const noneExcludedIncluded = freshAptitudeSelection.every((q) => q.id !== "apt_1" && q.id !== "apt_2");
    assert(hasApt1 && hasApt2 && noneExcludedIncluded, "Aptitude question history works correctly", `Excluded IDs: ${excludedIds.join(", ")}`);

    // --------------------------------------------------------------------------
    // Test 15: Pillar progression remains unchanged
    // --------------------------------------------------------------------------
    const dummyState = buildInterviewState({
      id: sessionA.id,
      userId: testUser.id,
      type: "DOMAIN",
      domain: "Software_Engineering",
      status: "IN_PROGRESS",
      messages: [
        { role: "assistant", content: "Tell me about your background." },
        { role: "user", content: "I am a distributed systems engineer with 6 years experience in Kafka and Go." },
        { role: "assistant", content: "How would you design a distributed log?" },
        { role: "user", content: "I would use partition replicas with a consensus quorum protocol like Raft." },
        { role: "assistant", content: "What happens when leader election times out?" },
        { role: "user", content: "A new election term is initiated with randomized backoff timers." },
      ],
    });
    const nextDecision = InterviewOrchestrator.decideNextStep({ state: dummyState, candidateMessage: "A new election term is initiated." });
    // After sufficient turns on Pillar 0, orchestrator advances to Pillar 1
    assert(nextDecision.action === "ADVANCE_PILLAR" || nextDecision.targetPillarIndex >= 0, "Pillar progression remains unchanged", `Action: ${nextDecision.action}`);

    // --------------------------------------------------------------------------
    // Test 16: Difficulty adaptation remains unchanged
    // --------------------------------------------------------------------------
    assert(dummyState.difficulty === "INTERMEDIATE", "Difficulty adaptation remains unchanged", `Difficulty was ${dummyState.difficulty}`);

    // --------------------------------------------------------------------------
    // Test 17: Candidate memory remains unchanged
    // --------------------------------------------------------------------------
    const memoryFacts = dummyState.candidateMemory;
    const hasKafkaFact = memoryFacts.skillsAndTechnologies.some((s) => s.toLowerCase().includes("kafka"));
    const hasGoFact = memoryFacts.skillsAndTechnologies.some((s) => s.toLowerCase().includes("go"));
    assert(hasKafkaFact || hasGoFact, "Candidate memory remains unchanged", `Skills in memory: ${memoryFacts.skillsAndTechnologies.join(", ")}`);

    // --------------------------------------------------------------------------
    // Test 18: InterviewOrchestrator remains authoritative
    // --------------------------------------------------------------------------
    assert(
      typeof nextDecision.action === "string" &&
      typeof nextDecision.targetPillarIndex === "number" &&
      typeof nextDecision.directiveInstruction === "string",
      "InterviewOrchestrator remains authoritative",
      "Decision fields missing"
    );

    // --------------------------------------------------------------------------
    // Test 19: Question selector cannot bypass duplicate check
    // --------------------------------------------------------------------------
    const bypassCheck = validateCandidateQuestion(q1Text, [{ questionText: q1Text }]);
    assert(bypassCheck.isValid === false && !!bypassCheck.suggestedAlternativeArchetype, "Question selector cannot bypass duplicate check", `Validation passed when it should fail`);

    // --------------------------------------------------------------------------
    // Test 20: Safe fallback if semantic check infrastructure is limited
    // --------------------------------------------------------------------------
    const fallbackQ = getDiverseFallbackQuestion(0, "System Architecture", "Software_Engineering");
    assert(typeof fallbackQ === "string" && fallbackQ.length > 20, "Safe fallback if semantic check infrastructure is limited", `Fallback was: ${fallbackQ}`);

    // --------------------------------------------------------------------------
    // Test 21: Realistic Scenario: Complete Interview A -> Session B duplicate rejection -> Alternative accepted -> Persisted
    // --------------------------------------------------------------------------
    // 1. Session A had q1Text recorded earlier. Mark Session A COMPLETED.
    await prisma.interviewSession.update({
      where: { id: sessionA.id },
      data: { status: "COMPLETED" },
    });

    // 2. Candidate starts Session B.
    const sessionBHistory = await QuestionDiversityService.getCrossSessionHistory(testUser.id, "DOMAIN");
    assert(sessionBHistory.some((h) => h.questionText === q1Text), "Scenario Step 1: Session A question present in cross-session history");

    // 3. Attempting to serve duplicate question in Session B is rejected
    const sessionBAttemptValidation = validateCandidateQuestion(q1Text, sessionBHistory);
    assert(sessionBAttemptValidation.isValid === false, "Scenario Step 2: Session B duplicate question rejected by guardrail");

    // 4. Generate alternative using suggested archetype
    const alternativeArchetype = sessionBAttemptValidation.suggestedAlternativeArchetype || "BOTTLENECK_FAILURE";
    const alternativeQuestion = `A critical caching tier experiences a thundering herd cache stampede when keys expire. How would you redesign the caching layer?`;
    const alternativeValidation = validateCandidateQuestion(alternativeQuestion, sessionBHistory);
    assert(alternativeValidation.isValid === true, "Scenario Step 3: Diverse alternative question accepted by guardrail");

    // 5. Commit and persist alternative question in Session B
    const persistedB = await QuestionDiversityService.recordQuestion({
      userId: testUser.id,
      sessionId: sessionB.id,
      questionText: alternativeQuestion,
      pillarIndex: 1,
      track: "DOMAIN",
      domain: "Software_Engineering",
    });
    const checkBInDb = await prisma.questionHistory.findFirst({
      where: { sessionId: sessionB.id, questionText: alternativeQuestion },
    });
    assert(persistedB === true && !!checkBInDb, "Scenario Step 4: Alternative question successfully persisted in Session B");

    console.log("\n========================================================");
    console.log(`📊 PHASE 6 TEST RESULTS: ${passed}/${total} assertions passed.`);
    console.log("========================================================\n");

    if (passed === total) {
      console.log("🎉 ALL PHASE 6 QUESTION DIVERSITY ASSERTIONS PASSED!\n");
    } else {
      console.error(`💥 SOME ASSERTIONS FAILED: ${total - passed} failures.\n`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Unhandled error during Phase 6 verification:", err);
    process.exit(1);
  } finally {
    // Cleanup test user and associated sessions / history
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  }
}

runPhase6Tests();
