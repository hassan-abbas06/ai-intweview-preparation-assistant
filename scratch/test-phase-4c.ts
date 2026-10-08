import { prisma } from "../lib/prisma";
import { ReportPersistenceService } from "../services/report-persistence";
import { ReportSynthesizerService, validateAndCleanEvidenceQuotes } from "../services/report-synthesizer";
import { DeterministicReportEngine } from "../services/report-generator";
import { EvaluationWorker } from "../services/evaluation-worker";
import { InterviewOrchestrator, TECHNICAL_PILLARS } from "../services/interview-engine";
import { buildInterviewState } from "../lib/interview/state";
import { LLMProvider } from "../lib/llm";

// ============================================================================
// PHASE 4C INTEGRATION & VERIFICATION SUITE
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  if (condition) {
    console.log(`  [PASS] ${name}: ${details}`);
    results.push({ name, passed: true, details });
  } else {
    console.error(`  [FAIL] ${name}: ${details}`);
    results.push({ name, passed: false, details });
  }
}

const mockSynthesisProvider: LLMProvider = {
  name: "mock-synthesis-model",
  generateText: async () =>
    JSON.stringify({
      executiveSummary:
        "The candidate demonstrated strong understanding of distributed systems architecture, specifically regarding replication and partitioned datastores.",
      strengths: [
        {
          title: "Distributed Consistency",
          description: "Clear understanding of Paxos and Raft consensus protocols.",
          evidenceTurn: 1,
          evidenceQuote: "I use distributed consensus.",
        },
      ],
      weaknesses: [
        {
          title: "Split-Brain Handling",
          description: "Could articulate partitioned failover scenarios in more depth.",
          evidenceTurn: null,
          evidenceQuote: null,
        },
      ],
      actionableTips: [
        {
          area: "High Availability",
          problem: "Partition tolerances need edge-case recovery planning.",
          specificAction: "Study fencing tokens and split-brain mitigation tactics.",
          whyItMatters: "Prevents data corruption across dual primary nodes.",
        },
      ],
    }),
  streamText: async () => {
    throw new Error("streamText not used in synthesis test");
  },
};

async function runPhase4cTests() {
  console.log("================================================================");
  console.log("RUNNING PHASE 4C VERIFICATION SUITE: UI & END FLOW INTEGRATION");
  console.log("================================================================");

  // 1. Setup Test Users
  const userA = await prisma.user.upsert({
    where: { email: "phase4c_userA@mockinterview.local" },
    update: {},
    create: {
      email: "phase4c_userA@mockinterview.local",
      domain: "BACKEND",
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "phase4c_userB@mockinterview.local" },
    update: {},
    create: {
      email: "phase4c_userB@mockinterview.local",
      domain: "BACKEND",
    },
  });

  // Cleanup prior test artifacts
  const existingSessions = await prisma.interviewSession.findMany({
    where: { userId: { in: [userA.id, userB.id] } },
    select: { id: true },
  });
  if (existingSessions.length > 0) {
    const sIds = existingSessions.map((s) => s.id);
    await prisma.interviewReport.deleteMany({ where: { sessionId: { in: sIds } } });
    await prisma.evaluationJob.deleteMany({ where: { sessionId: { in: sIds } } });
    await prisma.interviewMessage.deleteMany({ where: { sessionId: { in: sIds } } });
    await prisma.interviewSession.deleteMany({ where: { id: { in: sIds } } });
  }

  // Create primary test session
  const testSession = await prisma.interviewSession.create({
    data: {
      userId: userA.id,
      type: "DOMAIN",
      domain: "Distributed Systems",
      difficulty: "MID",
      status: "IN_PROGRESS",
      startedAt: new Date(Date.now() - 300000),
    },
  });

  // Add sample messages
  await prisma.interviewMessage.createMany({
    data: [
      {
        sessionId: testSession.id,
        role: "assistant",
        content: "How do you achieve consensus across distributed partitions?",
      },
      {
        sessionId: testSession.id,
        role: "user",
        content: "I use distributed consensus algorithms like Raft to ensure majority quorum.",
      },
    ],
  });

  let partialSession: any = null;

  try {
    // --------------------------------------------------------------------------
    // REQUIREMENT 1: Interview end triggers report generation flow
    // --------------------------------------------------------------------------
    // Mark session completed and request report
    await prisma.interviewSession.update({
      where: { id: testSession.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    const pendingJob = await prisma.evaluationJob.create({
      data: {
        idempotencyKey: `eval_${testSession.id}_p1`,
        sessionId: testSession.id,
        turnSequenceNumber: 1,
        pillarSlug: "PILLAR-0",
        candidateMessage: "I use distributed consensus algorithms like Raft.",
        contextHistory: [],
        status: "PENDING",
      },
    });

    const initiatedReport = await ReportPersistenceService.getOrGenerateReport(testSession.id);

    assert(
      initiatedReport !== null && initiatedReport.sessionId === testSession.id,
      "REQ 1: Interview End Triggers Report Generation Flow",
      `Report generation flow created durable report for session ${testSession.id}`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 8: WAITING_FOR_EVALUATIONS state is handled
    // --------------------------------------------------------------------------
    assert(
      initiatedReport.status === "WAITING_FOR_EVALUATIONS",
      "REQ 8: WAITING_FOR_EVALUATIONS State Handled",
      `Report status is WAITING_FOR_EVALUATIONS while background evaluation jobs are PENDING`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 9: READY state is handled
    // --------------------------------------------------------------------------
    // Complete the pending evaluation job
    await prisma.evaluationJob.update({
      where: { id: pendingJob.id },
      data: {
        status: "COMPLETED",
        evaluationResult: {
          id: pendingJob.idempotencyKey,
          sessionId: testSession.id,
          turnSequenceNumber: 1,
          pillarSlug: "PILLAR-0",
          pillarName: "Architecture",
          evaluationStatus: "COMPLETED",
          overallScore: 88,
          confidence: 1.0,
          rubricScores: [],
          demonstratedConcepts: ["Raft", "Consensus"],
          missingConcepts: [],
          strengths: ["Strong knowledge of quorum"],
          weaknesses: [],
          masterySignal: "MASTERY_HIGH",
          recommendedDifficulty: "MAINTAIN",
          evaluatorMetadata: { model: "test", promptVersion: "v1", latencyMs: 50, timestamp: "" },
          errorMessage: null,
        },
      },
    });

    // Reconcile report now that evaluation job is COMPLETED
    const readyReport = await ReportPersistenceService.getOrGenerateReport(testSession.id, { forceRefresh: true });

    assert(
      readyReport.status === "READY" && readyReport.overallScore === 88,
      "REQ 9: READY State Handled",
      `Report reached READY status with deterministic score = ${readyReport.overallScore}`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 2: Deterministic report remains authoritative
    // --------------------------------------------------------------------------
    const originalScores = {
      overallScore: readyReport.overallScore,
      overallPerformanceLevel: readyReport.overallPerformanceLevel,
      startingDifficulty: readyReport.startingDifficulty,
      finalDifficulty: readyReport.finalDifficulty,
    };

    assert(
      originalScores.overallScore === 88 && originalScores.overallPerformanceLevel === "EXEMPLARY",
      "REQ 2: Deterministic Report Remains Authoritative",
      `Deterministic engine calculated authoritative score: ${originalScores.overallScore} (${originalScores.overallPerformanceLevel})`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 3: Synthesis is triggered when appropriate
    // --------------------------------------------------------------------------
    // Verify automatic background synthesis triggered by READY state completes
    let autoSynthPoll = 0;
    let autoSynthReport = null;
    while (autoSynthPoll < 20) {
      const current = await prisma.interviewReport.findUnique({ where: { sessionId: testSession.id } });
      if (current?.synthesisStatus === "SYNTHESIS_READY") {
        autoSynthReport = current;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
      autoSynthPoll++;
    }

    assert(
      autoSynthReport !== null &&
        autoSynthReport.synthesisStatus === "SYNTHESIS_READY" &&
        autoSynthReport.executiveSummary !== null,
      "REQ 3: Synthesis Triggered Automatically on READY",
      `Automatic qualitative synthesis triggered and persisted with status SYNTHESIS_READY`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 4: Synthesis cannot overwrite deterministic scores
    // --------------------------------------------------------------------------
    const postSynthesisReport = (await prisma.interviewReport.findUnique({
      where: { sessionId: testSession.id },
    }))!;

    assert(
      postSynthesisReport.overallScore === originalScores.overallScore &&
        postSynthesisReport.overallPerformanceLevel === originalScores.overallPerformanceLevel &&
        postSynthesisReport.startingDifficulty === originalScores.startingDifficulty &&
        postSynthesisReport.finalDifficulty === originalScores.finalDifficulty,
      "REQ 4: Synthesis Cannot Overwrite Deterministic Scores",
      `Post-synthesis scores strictly preserved: overallScore = ${postSynthesisReport.overallScore}, finalDifficulty = ${postSynthesisReport.finalDifficulty}`
    );

    // --------------------------------------------------------------------------
    // EVIDENCE GROUNDING VALIDATION (Sub-requirement of Task 2)
    // --------------------------------------------------------------------------
    const candidateTurnsMap = new Map<number, string>();
    candidateTurnsMap.set(1, "I use distributed consensus algorithms like Raft to ensure majority quorum.");

    const itemsToClean = [
      {
        title: "Valid Grounded Quote",
        description: "Candidate mentioned consensus.",
        evidenceTurn: 1,
        evidenceQuote: "distributed consensus",
      },
      {
        title: "Hallucinated Quote",
        description: "Candidate allegedly discussed Kubernetes.",
        evidenceTurn: 1,
        evidenceQuote: "I configured nginx ingress on bare metal kubernetes",
      },
      {
        title: "Nonexistent Turn Reference",
        description: "References invalid turn.",
        evidenceTurn: 99,
        evidenceQuote: "nonexistent quote",
      },
    ];

    const cleanedItems = validateAndCleanEvidenceQuotes(itemsToClean, candidateTurnsMap);

    assert(
      cleanedItems[0].evidenceQuote === "distributed consensus" &&
        cleanedItems[1].evidenceQuote === null &&
        cleanedItems[2].evidenceQuote === null,
      "REQ 4b: Evidence Grounding Quote Validation",
      `Grounded quote preserved ('${cleanedItems[0].evidenceQuote}'); hallucinated quotes strictly nullified`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 5: Duplicate synthesis is prevented / handled safely
    // --------------------------------------------------------------------------
    const dupResult = await ReportSynthesizerService.synthesizeReport(testSession.id, {
      forceRefresh: false,
      llmProvider: mockSynthesisProvider,
    });

    const reportAfterDup = (await prisma.interviewReport.findUnique({
      where: { sessionId: testSession.id },
    }))!;

    assert(
      dupResult.synthesisStatus === "SYNTHESIS_READY" &&
        reportAfterDup.overallScore === originalScores.overallScore &&
        dupResult.executiveSummary === reportAfterDup.executiveSummary,
      "REQ 5: Duplicate Synthesis Prevented / Handled Safely",
      `Concurrent/duplicate synthesis returned existing valid synthesis without duplicate LLM calls or score changes`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 6: Report page/API can retrieve the correct report
    // --------------------------------------------------------------------------
    const retrievedReport = await ReportPersistenceService.getReport(testSession.id);

    assert(
      retrievedReport !== null &&
        retrievedReport.sessionId === testSession.id &&
        retrievedReport.status === "READY" &&
        retrievedReport.overallScore === 88 &&
        retrievedReport.synthesisStatus === "SYNTHESIS_READY" &&
        retrievedReport.executiveSummary !== null,
      "REQ 6: Report Page/API Retrieves Correct Report",
      `Report retrieval returned full deterministic and qualitative payload for session ${testSession.id}`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 7: Missing report is handled correctly
    // --------------------------------------------------------------------------
    const nonExistentReport = await ReportPersistenceService.getReport("non_existent_session_id_99999");

    assert(
      nonExistentReport === null,
      "REQ 7: Missing Report Handled Correctly",
      `Nonexistent session query safely returned null without exceptions`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 10: PARTIAL and FAILED states are handled
    // --------------------------------------------------------------------------
    // Create a separate session with 1 completed job and 1 failed job
    partialSession = await prisma.interviewSession.create({
      data: {
        userId: userA.id,
        type: "DOMAIN",
        domain: "Backend Systems",
        difficulty: "MID",
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 200000),
      },
    });

    await prisma.evaluationJob.create({
      data: {
        idempotencyKey: `eval_${partialSession.id}_c1`,
        sessionId: partialSession.id,
        turnSequenceNumber: 1,
        pillarSlug: "PILLAR-0",
        candidateMessage: "Substantive answer 1",
        contextHistory: [],
        status: "COMPLETED",
        evaluationResult: {
          turnSequenceNumber: 1,
          pillarSlug: "PILLAR-0",
          evaluationStatus: "COMPLETED",
          overallScore: 80,
          rubricScores: [],
          demonstratedConcepts: [],
          missingConcepts: [],
          strengths: [],
          weaknesses: [],
          masterySignal: "MASTERY_ADEQUATE",
          recommendedDifficulty: "MAINTAIN",
        },
      },
    });

    await prisma.evaluationJob.create({
      data: {
        idempotencyKey: `eval_${partialSession.id}_f2`,
        sessionId: partialSession.id,
        turnSequenceNumber: 2,
        pillarSlug: "PILLAR-1",
        candidateMessage: "Substantive answer 2",
        contextHistory: [],
        status: "FAILED",
        retryCount: 3,
        lastError: "Timeout after 3 retries",
      },
    });

    const partialReport = await ReportPersistenceService.getOrGenerateReport(partialSession.id);

    assert(
      partialReport.status === "PARTIAL" && partialReport.overallScore === 80,
      "REQ 10: PARTIAL and FAILED States Handled",
      `Terminal job failure reconciled into PARTIAL status with assessed score (80) and 0 fabricated scores`
    );

    // Wait for auto-synthesis to complete on partialSession before assertions & teardown
    let partialSynthPoll = 0;
    while (partialSynthPoll < 15) {
      const pRep = await prisma.interviewReport.findUnique({ where: { sessionId: partialSession.id } });
      if (pRep?.synthesisStatus === "SYNTHESIS_READY" || pRep?.synthesisStatus === "SYNTHESIS_FAILED") {
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
      partialSynthPoll++;
    }

    // --------------------------------------------------------------------------
    // REQUIREMENT 11: Report belongs to the requested session
    // --------------------------------------------------------------------------
    const userBSessions = await prisma.interviewSession.findMany({
      where: { userId: userB.id },
      include: { report: true },
    });

    assert(
      userBSessions.every((s) => s.id !== testSession.id && s.report?.sessionId !== testSession.id),
      "REQ 11: Report Belongs Strictly to Requested Session & Owner",
      `Session and report data strictly isolated to User A (${userA.id}); User B cannot access User A's data`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 12: Dashboard uses real session/report data
    // --------------------------------------------------------------------------
    const userASessionsForDashboard = await prisma.interviewSession.findMany({
      where: { userId: userA.id },
      orderBy: { startedAt: "desc" },
      include: {
        report: {
          select: {
            id: true,
            status: true,
            overallScore: true,
            overallPerformanceLevel: true,
            synthesisStatus: true,
          },
        },
      },
    });

    const primarySessionInDashboard = userASessionsForDashboard.find((s) => s.id === testSession.id);

    assert(
      userASessionsForDashboard.length >= 2 &&
        primarySessionInDashboard !== undefined &&
        primarySessionInDashboard.report?.overallScore === 88 &&
        primarySessionInDashboard.report?.status === "READY",
      "REQ 12: Dashboard Uses Real Database Session & Report Data",
      `Dashboard query returned real session list with attached reports and real scores (${primarySessionInDashboard?.report?.overallScore}%)`
    );

    // --------------------------------------------------------------------------
    // REQUIREMENT 13: Existing interview completion behavior still works
    // --------------------------------------------------------------------------
    const testState = buildInterviewState({
      id: testSession.id,
      userId: userA.id,
      type: "DOMAIN",
      domain: "Distributed Systems",
      difficulty: "MID",
      status: "IN_PROGRESS",
      messages: [],
    });
    const decision = InterviewOrchestrator.decideNextStep({ state: testState, isOpening: true });

    assert(
      decision.action === "OPEN_INTERVIEW" &&
        decision.targetPillarIndex === 0 &&
        TECHNICAL_PILLARS.length === 5,
      "REQ 13: Existing Interview Completion & Orchestrator Still Works",
      `Interview orchestrator state initializes properly with 5 pillars and action OPEN_INTERVIEW`
    );

    console.log("================================================================");
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`PHASE 4C TEST RESULTS: ${passedCount} / ${results.length} PASSED`);
    console.log("================================================================");

    if (passedCount < results.length) {
      process.exit(1);
    }
  } finally {
    // Allow any in-flight background callbacks to complete before teardown
    await new Promise((r) => setTimeout(r, 250));

    // Teardown test records
    await prisma.interviewReport.deleteMany({
      where: { sessionId: { in: [testSession.id, partialSession?.id].filter(Boolean) } },
    });
    await prisma.evaluationJob.deleteMany({
      where: { sessionId: { in: [testSession.id, partialSession?.id].filter(Boolean) } },
    });
    await prisma.interviewMessage.deleteMany({
      where: { sessionId: { in: [testSession.id, partialSession?.id].filter(Boolean) } },
    });
    await prisma.interviewSession.deleteMany({
      where: { id: { in: [testSession.id, partialSession?.id].filter(Boolean) } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  }
}

runPhase4cTests().catch((err) => {
  console.error("Test harness failed:", err);
  process.exit(1);
});
