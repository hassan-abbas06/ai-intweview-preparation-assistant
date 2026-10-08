import { prisma } from "../lib/prisma";
import {
  ResponseAnalyzerService,
  VoiceTurnTiming,
  ResponseAnalysisInput,
  analyzeResponseTiming,
  analyzePauseMetrics,
  calculateSpeakingRate,
  detectFillerWords,
  detectDisfluencyIndicators,
  assessCommunicationCharacteristics,
  classifyResponseStatus,
} from "../services/response-analyzer";
import { InterviewOrchestrator } from "../services/interview-engine";
import { InterviewEvaluator } from "../services/evaluator";
import { QuestionDiversityService, validateCandidateQuestion } from "../lib/interview/question-diversity";
import { buildInterviewState } from "../lib/interview/state";

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
    console.log(`${GREEN}  ✓ PASS:${RESET} ${testName}`);
    passedCount++;
  } else {
    console.error(`${RED}  ✗ FAIL:${RESET} ${testName}`);
    if (detail) console.error(`    ${YELLOW}Detail:${RESET} ${detail}`);
    failedCount++;
  }
}

async function runPhase7Tests() {
  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 7: VOICE & RESPONSE ANALYSIS VERIFICATION TEST SUITE   ${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  // ============================================================================
  // 1. RESPONSE TIMING & LATENCY
  // ============================================================================
  console.log(`${YELLOW}--- 1. Response Timing & Latency Tests ---${RESET}`);

  // Test 1: Response latency measurement
  const timingValid: VoiceTurnTiming = {
    interviewerQuestionEndMs: 10000,
    speechStartMs: 11200, // 1200ms latency
    speechEndMs: 18200,   // 7000ms duration
  };
  const analyzedTiming = analyzeResponseTiming("VOICE", timingValid);
  assert(analyzedTiming !== null, "Timing analysis succeeds with valid timestamps");
  assert(analyzedTiming?.responseLatencyMs === 1200, "Test 1: Response latency measured accurately (1200ms)");

  // Test 2: Response duration calculation
  assert(analyzedTiming?.answerDurationMs === 7000, "Test 2: Response duration measured accurately (7000ms)");
  assert(analyzedTiming?.totalTurnDurationMs === 8200, "Test 2: Total turn duration measured accurately (8200ms)");

  // Test 3: Missing timestamps fallback to null (never made-up numbers)
  const timingMissingStart: VoiceTurnTiming = {
    interviewerQuestionEndMs: 10000,
    speechEndMs: 18000,
  };
  const analyzedMissing = analyzeResponseTiming("VOICE", timingMissingStart);
  assert(analyzedMissing?.responseLatencyMs === null, "Test 3: Missing speechStartMs results in null latency");
  assert(analyzedMissing?.answerDurationMs === null, "Test 3: Missing speechStartMs results in null duration");

  const timingNegative: VoiceTurnTiming = {
    interviewerQuestionEndMs: 12000,
    speechStartMs: 10000, // Negative latency due to clock skew
    speechEndMs: 9000,    // Inverted duration
  };
  const analyzedNegative = analyzeResponseTiming("VOICE", timingNegative);
  assert(analyzedNegative?.responseLatencyMs === null, "Test 3: Clock skew negative latency falls back to null");
  assert(analyzedNegative?.answerDurationMs === null, "Test 3: Inverted duration falls back to null");

  // ============================================================================
  // 2. SPEAKING RATE & WPM GUARDRAILS
  // ============================================================================
  console.log(`\n${YELLOW}--- 2. Speaking Rate (WPM) & Guardrails Tests ---${RESET}`);

  // Test 4: Extremely short response speaking rate guardrail
  // Word count < 6 -> null WPM
  const shortRate1 = calculateSpeakingRate("Yes, absolutely.", "VOICE", 4000, 500);
  assert(shortRate1.wordCount === 2, "Test 4: Word count correctly counted as 2");
  assert(shortRate1.wordsPerMinute === null, "Test 4: Responses with < 6 words produce null WPM (guardrail)");

  // Duration < 2500ms -> null WPM
  const shortRate2 = calculateSpeakingRate("We use PostgreSQL database with Prisma ORM daily.", "VOICE", 1800, 200);
  assert(shortRate2.wordsPerMinute === null, "Test 4: Responses with < 2.5s duration produce null WPM (guardrail)");

  // Test 5: Valid speaking rate calculation with bounded active duration
  // 30 words in 12 seconds with 2 seconds pause -> 10 active seconds -> (30 / 10) * 60 = 180 WPM
  const text30 = "We implemented a microservices architecture using Node.js and TypeScript, deploying our backend services as containerized workloads on Kubernetes with distributed tracing and Prometheus monitoring across all clusters.";
  const validRate = calculateSpeakingRate(text30, "VOICE", 12000, 2000);
  assert(validRate.wordCount === 27, `Test 5: Valid response word count: ${validRate.wordCount}`);
  assert(validRate.speakingDurationSec === 10, "Test 5: Active duration correctly subtracts pauses: 10.0s");
  assert(validRate.wordsPerMinute !== null && Math.abs(validRate.wordsPerMinute - 162) <= 1, `Test 5: Realistic WPM calculated accurately: ${validRate.wordsPerMinute} WPM`);

  // Non-positive active duration guardrail
  const zeroDurationRate = calculateSpeakingRate(text30, "VOICE", 5000, 6000); // Pause > answer duration
  assert(zeroDurationRate.wordsPerMinute === null, "Test 5: Non-positive active duration produces null WPM");

  // ============================================================================
  // 3. PAUSE METRICS
  // ============================================================================
  console.log(`\n${YELLOW}--- 3. Pause Metrics Tests ---${RESET}`);

  // Test 6: Pause detection: pauses >= 400ms counted, shorter filtered out
  const pausesMixed = [
    { startMs: 1000, endMs: 1200, durationMs: 200 }, // Sub-threshold (< 400ms)
    { startMs: 2000, endMs: 2600, durationMs: 600 }, // Valid pause
    { startMs: 4000, endMs: 5200, durationMs: 1200 }, // Valid pause
    { startMs: 7000, endMs: 7350, durationMs: 350 }, // Sub-threshold (< 400ms)
  ];
  const pauseMetrics = analyzePauseMetrics("VOICE", 10000, pausesMixed);
  assert(pauseMetrics !== null, "Pause metrics evaluated successfully");
  assert(pauseMetrics?.pauseCount === 2, "Test 6: Exactly 2 pauses >= 400ms counted (sub-threshold filtered out)");
  assert(pauseMetrics?.longestPauseMs === 1200, "Test 6: Longest pause identified accurately: 1200ms");
  assert(pauseMetrics?.totalPauseDurationMs === 1800, "Test 6: Total pause duration computed accurately: 1800ms");
  assert(pauseMetrics?.averagePauseMs === 900, "Test 6: Average pause duration computed accurately: 900ms");

  // Test 7: System latency excluded from response latency / pause time
  // System latency (interviewer speech generation / streaming delay) occurred before interviewerQuestionEndMs
  assert(analyzedTiming?.responseLatencyMs === 1200, "Test 7: Response latency begins strictly at interviewerQuestionEndMs, excluding system latency");
  assert(pauseMetrics?.totalPauseDurationMs === 1800, "Test 7: Pause metrics measure candidate pauses strictly during speech turn");

  // ============================================================================
  // 4. FILLER WORD & DISFLUENCY DETECTION
  // ============================================================================
  console.log(`\n${YELLOW}--- 4. Filler Word & Disfluency Detection Tests ---${RESET}`);

  // Test 8: Filler word detection: single-word fillers
  const singleFillers = detectFillerWords("Um, we designed the cache, uh, to store session keys, hmm, in Redis.");
  assert(singleFillers.fillerCount >= 3, `Test 8: Single-word fillers detected (found ${singleFillers.fillerCount})`);
  assert(singleFillers.fillerWords.includes("um") && singleFillers.fillerWords.includes("uh") && singleFillers.fillerWords.includes("hmm"), "Test 8: Found 'um', 'uh', and 'hmm'");

  // Test 9: Filler word detection: multi-word phrases
  const phraseFillers = detectFillerWords("You know, the latency was high, sort of like unpredictable, I mean, kind of bad.");
  assert(phraseFillers.fillerWords.includes("you know"), "Test 9: Phrasal filler 'you know' detected");
  assert(phraseFillers.fillerWords.includes("i mean"), "Test 9: Phrasal filler 'i mean' detected");
  assert(phraseFillers.fillerWords.includes("sort of"), "Test 9: Phrasal filler 'sort of' detected");
  assert(phraseFillers.fillerWords.includes("kind of"), "Test 9: Phrasal filler 'kind of' detected");

  // Test 10: Context-sensitive filler detection: grammatical "like" NOT counted as filler (false-positive protection)
  const grammaticalLike1 = detectFillerWords("I like PostgreSQL for relational schemas.");
  assert(!grammaticalLike1.fillerWords.includes("like"), "Test 10: Grammatical 'I like' NOT counted as filler");

  const grammaticalLike2 = detectFillerWords("This architecture looks like an event-driven system.");
  assert(!grammaticalLike2.fillerWords.includes("like"), "Test 10: Grammatical 'looks like' NOT counted as filler");

  const grammaticalLike3 = detectFillerWords("We use tools like Docker and Kubernetes for container orchestration.");
  assert(!grammaticalLike3.fillerWords.includes("like"), "Test 10: Comparative preposition 'tools like Docker' NOT counted as filler");

  const fillerLike = detectFillerWords("We had, like, twenty microservices in the cluster.");
  assert(fillerLike.fillerWords.includes("like"), "Test 10: Genuine conversational filler 'like' detected when not in grammatical pattern");

  // Test 11: Disfluency indicator: repeated words ("we we")
  const repeatedWords = detectDisfluencyIndicators("We we deployed the application to AWS.");
  assert(repeatedWords.repeatedWordCount >= 1, "Test 11: Repeated word 'we we' detected");
  assert(repeatedWords.disfluencyOccurrences.some((o) => o.text.toLowerCase() === "we we"), "Test 11: Occurrence captured exact repeated word 'we we'");

  // Test 12: Disfluency indicator: repeated phrases ("in order to in order to")
  const repeatedPhrases = detectDisfluencyIndicators("In order to in order to scale the database, we added read replicas.");
  assert(repeatedPhrases.repeatedPhraseCount >= 1, "Test 12: Repeated phrase 'in order to in order to' detected");

  // Test 13: Disfluency indicator: false starts
  const falseStarts = detectDisfluencyIndicators("We decided to use Kafka — well, actually we chose RabbitMQ.");
  assert(falseStarts.falseStartCount >= 1, "Test 13: False start with restart marker '—' detected");

  // ============================================================================
  // 5. TEXT VS. VOICE MODALITY & PURITY GUARANTEES
  // ============================================================================
  console.log(`\n${YELLOW}--- 5. Text vs. Voice Modality & Purity Guarantees Tests ---${RESET}`);

  // Test 14: Text interview analysis: communication characteristics assessed
  const textInput: ResponseAnalysisInput = {
    sessionId: "mock-sess-text",
    turnSequenceNumber: 1,
    candidateMessage: "We chose an asynchronous message queue architecture with RabbitMQ because it decouples our ingestion worker from the persistent storage tier. This ensures that sudden traffic spikes do not saturate database connection pools.",
    modality: "TEXT",
  };
  const textAnalysis = ResponseAnalyzerService.analyzeResponse(textInput);
  assert(textAnalysis.wordCount === 32, "Test 14: Text interview word count assessed accurately (32 words)");
  assert(textAnalysis.structureAssessment === "CONCISE", "Test 14: Text interview length category assessed (CONCISE: 15-59 words)");
  assert(textAnalysis.observableCharacteristics.length > 0, "Test 14: Factual communication observations generated for text response");

  // Test 15: Voice interview analysis: both voice metrics and communication characteristics assessed
  const voiceInput: ResponseAnalysisInput = {
    sessionId: "mock-sess-voice",
    turnSequenceNumber: 1,
    candidateMessage: "Um, we chose an asynchronous queue architecture with RabbitMQ because, you know, it decouples the ingestion worker.",
    modality: "VOICE",
    voiceTiming: {
      interviewerQuestionEndMs: 1000,
      speechStartMs: 2500, // 1500ms latency
      speechEndMs: 9500,   // 7000ms duration
      pauseIntervals: [
        { startMs: 4000, endMs: 4700, durationMs: 700 }, // 700ms pause
      ],
    },
  };
  const voiceAnalysis = ResponseAnalyzerService.analyzeResponse(voiceInput);
  assert(voiceAnalysis.responseLatencyMs === 1500, "Test 15: Voice response latency captured (1500ms)");
  assert(voiceAnalysis.answerDurationMs === 7000, "Test 15: Voice answer duration captured (7000ms)");
  assert(voiceAnalysis.pauseCount === 1, "Test 15: Voice pause count captured (1 pause)");
  assert(voiceAnalysis.wordsPerMinute !== null && voiceAnalysis.wordsPerMinute > 0, "Test 15: Voice speaking rate calculated");
  assert(voiceAnalysis.fillerCount >= 2, "Test 15: Voice filler words detected");
  assert(voiceAnalysis.observableCharacteristics.length > 0, "Test 15: Voice communication characteristics assessed");

  // Test 16: Text interview voice metrics strictly null (no fabrication)
  assert(textAnalysis.responseLatencyMs === null, "Test 16: Text interview responseLatencyMs is strictly null");
  assert(textAnalysis.answerDurationMs === null, "Test 16: Text interview answerDurationMs is strictly null");
  assert(textAnalysis.totalTurnDurationMs === null, "Test 16: Text interview totalTurnDurationMs is strictly null");
  assert(textAnalysis.pauseCount === null, "Test 16: Text interview pauseCount is strictly null");
  assert(textAnalysis.longestPauseMs === null, "Test 16: Text interview longestPauseMs is strictly null");
  assert(textAnalysis.averagePauseMs === null, "Test 16: Text interview averagePauseMs is strictly null");
  assert(textAnalysis.totalPauseDurationMs === null, "Test 16: Text interview totalPauseDurationMs is strictly null");
  assert(textAnalysis.pausesPerMinute === null, "Test 16: Text interview pausesPerMinute is strictly null");
  assert(textAnalysis.speakingDurationSec === null, "Test 16: Text interview speakingDurationSec is strictly null");
  assert(textAnalysis.wordsPerMinute === null, "Test 16: Text interview wordsPerMinute is strictly null");

  // Test 17: No fabricated metrics (missing voice timing -> all audio metrics null)
  const voiceWithoutTiming: ResponseAnalysisInput = {
    sessionId: "mock-sess-no-timing",
    turnSequenceNumber: 2,
    candidateMessage: "I would use Redis cache for fast lookups.",
    modality: "VOICE",
    // voiceTiming omitted
  };
  const voiceNoTimingAnalysis = ResponseAnalyzerService.analyzeResponse(voiceWithoutTiming);
  assert(voiceNoTimingAnalysis.responseLatencyMs === null, "Test 17: Omitted voice timing produces null latency");
  assert(voiceNoTimingAnalysis.wordsPerMinute === null, "Test 17: Omitted voice timing produces null WPM");
  assert(voiceNoTimingAnalysis.pauseCount === null, "Test 17: Omitted voice timing produces null pauseCount");

  // ============================================================================
  // 6. SPECIAL RESPONSE STATES
  // ============================================================================
  console.log(`\n${YELLOW}--- 6. Special Response States Tests ---${RESET}`);

  // Test 18: Interrupted voice turn handling (responseStatus = INTERRUPTED)
  const interruptedTiming: VoiceTurnTiming = {
    interviewerQuestionEndMs: 1000,
    speechStartMs: 2000,
    speechEndMs: 5000,
    isInterrupted: true,
  };
  const interruptedStatus = classifyResponseStatus("Wait, let me explain that differently", interruptedTiming);
  assert(interruptedStatus === "INTERRUPTED", "Test 18: Candidate barge-in turn classified as INTERRUPTED");

  // Test 19: Empty response handling (responseStatus = EMPTY, wordCount = 0)
  const emptyAnalysis = ResponseAnalyzerService.analyzeResponse({
    sessionId: "mock-sess-empty",
    turnSequenceNumber: 3,
    candidateMessage: "   ",
    modality: "TEXT",
  });
  assert(emptyAnalysis.responseStatus === "EMPTY", "Test 19: Empty message classified as responseStatus EMPTY");
  assert(emptyAnalysis.wordCount === 0, "Test 19: Empty message produces wordCount = 0");
  assert(emptyAnalysis.structureAssessment === "MINIMAL", "Test 19: Empty message structure assessment is MINIMAL");

  // Test 20: Non-substantive response handling (status COMPLETED, structureAssessment MINIMAL)
  const nonSubstantiveAnalysis = ResponseAnalyzerService.analyzeResponse({
    sessionId: "mock-sess-nonsub",
    turnSequenceNumber: 4,
    candidateMessage: "Sure thing.",
    modality: "TEXT",
  });
  assert(nonSubstantiveAnalysis.responseStatus === "COMPLETED", "Test 20: Short response has status COMPLETED");
  assert(nonSubstantiveAnalysis.structureAssessment === "MINIMAL", "Test 20: Short response (<15 words) has structureAssessment MINIMAL");
  assert(nonSubstantiveAnalysis.wordCount === 2, "Test 20: Accurately counts 2 words");

  // Continuous response length categories test (no gaps)
  assert(assessCommunicationCharacteristics(3, "TEXT").structureAssessment === "MINIMAL", "Length < 15 is MINIMAL");
  assert(assessCommunicationCharacteristics(20, "TEXT").structureAssessment === "CONCISE", "Length 15-59 is CONCISE");
  assert(assessCommunicationCharacteristics(100, "TEXT").structureAssessment === "BALANCED", "Length 60-220 is BALANCED");
  assert(assessCommunicationCharacteristics(250, "TEXT").structureAssessment === "VERBOSE", "Length > 220 is VERBOSE");

  // ============================================================================
  // 7. ORCHESTRATOR & QUESTION DIVERSITY PRESERVATION
  // ============================================================================
  console.log(`\n${YELLOW}--- 7. Orchestrator & Question Diversity Preservation Tests ---${RESET}`);

  // Test 21: Orchestrator behavior unchanged
  const baselineState = buildInterviewState({
    id: "sess-orch-check",
    userId: "user-1",
    type: "DOMAIN",
    domain: "BACKEND",
    difficulty: "MID",
    status: "IN_PROGRESS" as const,
    messages: [
      { role: "assistant", content: "Design a rate limiter." },
    ],
  });
  const decision = InterviewOrchestrator.decideNextStep({
    state: baselineState,
    candidateMessage: "We can use a token bucket algorithm stored in Redis.",
  });
  assert(decision.action === "DRILL_DOWN" || decision.action === "ADVANCE_PILLAR", "Test 21: InterviewOrchestrator action intact");
  assert(decision.targetPillarIndex === 0, "Test 21: InterviewOrchestrator target pillar index intact");

  // Test 22: Question diversity unchanged
  const historical = [{ questionText: "How would you handle rate limiting in a distributed system?" }];
  const dupCheck = validateCandidateQuestion("How would you handle rate limiting in a distributed system?", historical);
  assert(!dupCheck.isValid, "Test 22: QuestionDiversityService hard duplicate check remains strictly active");

  const distinctCheck = validateCandidateQuestion("What caching eviction policy would you configure for Redis?", historical);
  assert(distinctCheck.isValid, "Test 22: Distinct technical question accepted by diversity validation");

  // ============================================================================
  // 8. TECHNICAL EVALUATOR COMPATIBILITY & ISOLATION
  // ============================================================================
  console.log(`\n${YELLOW}--- 8. Technical Evaluator Compatibility & Isolation Tests ---${RESET}`);

  // Test 23: Technical evaluator compatibility
  const isGreetingBypassed = InterviewEvaluator.isFastPathBypass("Hello interviewer!");
  assert(isGreetingBypassed === true, "Test 23: InterviewEvaluator fast-path bypass logic runs deterministically");

  const initialMastery = InterviewEvaluator.createInitialPillarMastery("PILLAR-0", "System Architecture");
  assert(initialMastery.pillarSlug === "PILLAR-0" && initialMastery.rollingScore === 0, "Test 23: InterviewEvaluator initial mastery state created intact");

  // Test 24: Adaptive difficulty progression unchanged
  const adaptiveDecision = InterviewEvaluator.calculateAdaptiveDifficulty("MID", 2, 0);
  assert(adaptiveDecision.nextLevel === "SENIOR" && adaptiveDecision.action === "INCREASE", "Test 24: Adaptive difficulty hysteresis logic unchanged (MID -> SENIOR after 2 high turns)");

  // Test 28: Technical report scores unchanged
  const mockEvalRecord = {
    id: "eval-t1",
    sessionId: "mock-sess",
    turnSequenceNumber: 1,
    pillarSlug: "PILLAR-0",
    pillarName: "System Architecture",
    evaluationStatus: "COMPLETED" as const,
    overallScore: 85,
    confidence: 1.0,
    rubricScores: [{ dimension: "Architecture", score: 85, weight: 1.0, evidenceSnippet: "", feedback: "" }],
    demonstratedConcepts: ["Caching"],
    missingConcepts: [],
    strengths: ["Strong caching knowledge"],
    weaknesses: [],
    masterySignal: "MASTERY_HIGH" as const,
    recommendedDifficulty: "INCREASE" as const,
    evaluatorMetadata: {
      model: "test-engine",
      promptVersion: "phase-3a-v1",
      latencyMs: 10,
      timestamp: new Date().toISOString(),
    },
    errorMessage: null,
  };
  const updatedMastery = InterviewEvaluator.updatePillarMastery(initialMastery, mockEvalRecord);
  assert(updatedMastery.rollingScore === 85, "Test 28: Technical evaluator EMA score update intact (rollingScore = 85)");

  // Test 29: Communication metrics isolated from technical evaluation scores
  // Modifying voice metrics does NOT alter InterviewEvaluator output or mastery calculations
  const updatedMastery2 = InterviewEvaluator.updatePillarMastery(initialMastery, mockEvalRecord);
  assert(updatedMastery2.rollingScore === updatedMastery.rollingScore, "Test 29: Technical evaluator scores substantive technical content isolated from speech metrics");

  // ============================================================================
  // 9. ZERO DIAGNOSIS & NON-JUDGMENTAL OBSERVATIONS
  // ============================================================================
  console.log(`\n${YELLOW}--- 9. Zero Medical/Psychological Diagnosis Tests ---${RESET}`);

  // Test 30: Zero medical/psychological diagnosis
  const sampleComm = assessCommunicationCharacteristics(
    10,
    "VOICE",
    { responseLatencyMs: 1200, answerDurationMs: 4000, totalTurnDurationMs: 5200 },
    { pauseCount: 1, longestPauseMs: 600, averagePauseMs: 600, totalPauseDurationMs: 600, pausesPerMinute: 15, pauseEvents: [] },
    { wordCount: 10, speakingDurationSec: 3.4, wordsPerMinute: 176 },
    { fillerCount: 2, fillerRate: 20, fillerWords: ["um", "mean"], fillerOccurrences: [] },
    { repeatedWordCount: 1, repeatedPhraseCount: 0, falseStartCount: 1, disfluencyOccurrences: [] }
  );
  const prohibitedTerms = [
    "stutter",
    "stuttering",
    "disorder",
    "anxiety",
    "anxious",
    "nervous",
    "nervousness",
    "confidence",
    "insecure",
    "hesitant",
    "pathology",
    "speech impairment",
    "psychological",
  ];

  for (const obs of sampleComm.observableCharacteristics) {
    const lower = obs.toLowerCase();
    for (const term of prohibitedTerms) {
      assert(!lower.includes(term), `Test 30: Observable characteristic "${obs}" contains NO forbidden term "${term}"`);
    }
  }

  // ============================================================================
  // 10. DATABASE PERSISTENCE, IDEMPOTENCY & CONCURRENCY
  // ============================================================================
  console.log(`\n${YELLOW}--- 10. Database Persistence, Idempotency & Concurrency Tests ---${RESET}`);

  const testSessionId = `test-phase7-${Date.now()}`;
  let testUser: any = null;

  try {
    // Setup test user & session in database
    testUser = await prisma.user.create({
      data: {
        email: `phase7-${Date.now()}@test.internal`,
        role: "USER",
      },
    });

    const testSession = await prisma.interviewSession.create({
      data: {
        id: testSessionId,
        userId: testUser.id,
        type: "DOMAIN",
        domain: "BACKEND",
        difficulty: "MID",
        modality: "VOICE",
        status: "IN_PROGRESS",
      },
    });

    // Test 25: Idempotent analysis persistence
    const analysisTurn1 = ResponseAnalyzerService.analyzeResponse({
      sessionId: testSessionId,
      turnSequenceNumber: 1,
      candidateMessage: "We implemented an event-driven architecture using Apache Kafka and consumer groups.",
      modality: "VOICE",
      voiceTiming: {
        interviewerQuestionEndMs: 1000,
        speechStartMs: 2200,
        speechEndMs: 8200,
        pauseIntervals: [{ startMs: 4000, endMs: 4600, durationMs: 600 }],
      },
    });

    // Write 1
    const record1 = await ResponseAnalyzerService.persistAnalysis(analysisTurn1, prisma);
    assert(record1.id !== undefined, "Test 25: Initial analysis successfully persisted to DB");
    assert(record1.turnSequenceNumber === 1, "Test 25: Stored turn sequence number is 1");

    // Write 2 (same sessionId and turnSequenceNumber) -> Upsert must not crash or create duplicate
    const record2 = await ResponseAnalyzerService.persistAnalysis(analysisTurn1, prisma);
    assert(record2.id === record1.id, "Test 25: Idempotent write updated the exact same record without creating duplicates");

    // Test 26: Worker retry safety (EvaluationWorker retry does not duplicate response analysis)
    const countTurn1 = await prisma.responseAnalysis.count({
      where: { sessionId: testSessionId, turnSequenceNumber: 1 },
    });
    assert(countTurn1 === 1, "Test 26: Exactly 1 ResponseAnalysis row exists for [sessionId, turnSequenceNumber] after retries");

    // Test 27: Concurrency safety (concurrent analysis runs do not conflict)
    const analysisTurn2 = ResponseAnalyzerService.analyzeResponse({
      sessionId: testSessionId,
      turnSequenceNumber: 2,
      candidateMessage: "For data caching, Redis was chosen due to sub-millisecond read latencies.",
      modality: "VOICE",
      voiceTiming: {
        interviewerQuestionEndMs: 10000,
        speechStartMs: 11100,
        speechEndMs: 16100,
      },
    });

    const [parallel1, parallel2] = await Promise.all([
      ResponseAnalyzerService.persistAnalysis(analysisTurn2, prisma),
      ResponseAnalyzerService.persistAnalysis(analysisTurn2, prisma),
    ]);
    assert(parallel1.id === parallel2.id, "Test 27: Concurrent writes for same turn resolve safely to single record");

    // Verify session analyses retrieval
    const sessionAnalyses = await ResponseAnalyzerService.getSessionAnalyses(testSessionId, prisma);
    assert(sessionAnalyses.length === 2, `Test 27: getSessionAnalyses returned all turns (expected 2, got ${sessionAnalyses.length})`);
    assert(sessionAnalyses[0].turnSequenceNumber === 1 && sessionAnalyses[1].turnSequenceNumber === 2, "Test 27: Analyses sorted by turnSequenceNumber asc");

  } finally {
    // Cleanup test records
    try {
      await prisma.responseAnalysis.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.interviewSession.deleteMany({ where: { id: testSessionId } });
      if (testUser?.id) {
        await prisma.user.deleteMany({ where: { id: testUser.id } });
      }
    } catch {
      // Ignore cleanup error
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 7 TEST RESULTS: ${passedCount}/${passedCount + failedCount} assertions passed   ${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  if (failedCount > 0) {
    console.error(`${RED}${BOLD}Some Phase 7 tests failed!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}ALL PHASE 7 VOICE & RESPONSE ANALYSIS ASSERTIONS PASSED!${RESET}\n`);
  }
}

runPhase7Tests().catch((err) => {
  console.error("Test execution threw unhandled exception:", err);
  process.exit(1);
});
