import { prisma } from "../lib/prisma";
import { InterviewDeletionService } from "../services/interview-deletion";

async function runTests() {
  console.log("=== RUNNING INTERVIEW DELETION / CLEAR TESTS ===");

  let testPassed = 0;
  let testTotal = 0;

  function assert(condition: boolean, msg: string) {
    testTotal++;
    if (condition) {
      testPassed++;
      console.log(`  ✓ [PASS] ${msg}`);
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Setup test users
  const timestamp = Date.now();
  const testUser1 = await prisma.user.create({
    data: {
      email: `test_delete_u1_${timestamp}@example.com`,
      domain: "FULL_STACK",
    },
  });

  const testUser2 = await prisma.user.create({
    data: {
      email: `test_delete_u2_${timestamp}@example.com`,
      domain: "FRONTEND",
    },
  });

  try {
    // 2. Test Single Session Cascade Deletion
    console.log("\n--- TEST GROUP 1: Single Session Deletion & Cascade ---");

    const session1 = await prisma.interviewSession.create({
      data: {
        userId: testUser1.id,
        type: "DOMAIN",
        domain: "FULL_STACK",
        difficulty: "INTERMEDIATE",
        status: "COMPLETED",
        score: 85,
      },
    });

    // Add report
    const report1 = await prisma.interviewReport.create({
      data: {
        sessionId: session1.id,
        status: "READY",
        overallScore: 85,
        overallPerformanceLevel: "COMPETENT",
      },
    });

    // Add message
    const msg1 = await prisma.interviewMessage.create({
      data: {
        sessionId: session1.id,
        role: "user",
        content: "I use React and PostgreSQL.",
      },
    });

    // Add evaluation job
    const job1 = await prisma.evaluationJob.create({
      data: {
        idempotencyKey: `delete-test-job-${session1.id}-1`,
        sessionId: session1.id,
        turnSequenceNumber: 1,
        pillarSlug: "system_design",
        candidateMessage: "I use React and PostgreSQL.",
        contextHistory: [],
      },
    });

    // Add question history
    const q1 = await prisma.questionHistory.create({
      data: {
        userId: testUser1.id,
        sessionId: session1.id,
        track: "DOMAIN",
        questionText: "What database would you choose?",
        normalizedText: "what database would you choose",
      },
    });

    // Add response analysis
    const ra1 = await prisma.responseAnalysis.create({
      data: {
        sessionId: session1.id,
        turnSequenceNumber: 1,
        wordCount: 30,
        wordsPerMinute: 120,
      },
    });

    // Sub-test A: Delete report only
    console.log("Sub-test A: Delete Report Only");
    const repDelForbidden = await InterviewDeletionService.deleteReportOnly(session1.id, testUser2.id);
    assert(repDelForbidden.success === false && repDelForbidden.code === "FORBIDDEN", "Non-owner cannot delete report");

    const repDelSuccess = await InterviewDeletionService.deleteReportOnly(session1.id, testUser1.id);
    assert(repDelSuccess.success === true, "Owner successfully deletes report only");

    const repAfter = await prisma.interviewReport.findUnique({ where: { sessionId: session1.id } });
    assert(repAfter === null, "Report record is deleted");

    const sessionAfterReportDel = await prisma.interviewSession.findUnique({ where: { id: session1.id } });
    assert(sessionAfterReportDel !== null && sessionAfterReportDel.score === null, "Session remains intact and score is reset to null");

    // Sub-test B: Recreate report and delete entire session
    console.log("Sub-test B: Full Session Cascade Deletion");
    await prisma.interviewReport.create({
      data: {
        sessionId: session1.id,
        status: "READY",
        overallScore: 85,
        overallPerformanceLevel: "COMPETENT",
      },
    });

    const notFoundRes = await InterviewDeletionService.deleteSession("non-existent-session-id", testUser1.id);
    assert(notFoundRes.success === false && notFoundRes.code === "NOT_FOUND", "Deleting non-existent session returns NOT_FOUND");

    const forbiddenRes = await InterviewDeletionService.deleteSession(session1.id, testUser2.id);
    assert(forbiddenRes.success === false && forbiddenRes.code === "FORBIDDEN", "Deleting another user's session returns FORBIDDEN");

    const deleteSuccess = await InterviewDeletionService.deleteSession(session1.id, testUser1.id);
    assert(deleteSuccess.success === true, "Owner successfully deletes session");

    // Verify all cascading records are deleted
    const sessionGone = await prisma.interviewSession.findUnique({ where: { id: session1.id } });
    const reportGone = await prisma.interviewReport.findUnique({ where: { sessionId: session1.id } });
    const msgGone = await prisma.interviewMessage.findMany({ where: { sessionId: session1.id } });
    const jobGone = await prisma.evaluationJob.findMany({ where: { sessionId: session1.id } });
    const qGone = await prisma.questionHistory.findMany({ where: { sessionId: session1.id } });
    const raGone = await prisma.responseAnalysis.findMany({ where: { sessionId: session1.id } });

    assert(sessionGone === null, "Session record deleted");
    assert(reportGone === null, "Report record deleted");
    assert(msgGone.length === 0, "Interview messages deleted");
    assert(jobGone.length === 0, "Evaluation jobs deleted");
    assert(qGone.length === 0, "Question history deleted");
    assert(raGone.length === 0, "Response analysis deleted");

    // 3. Test Bulk Clear
    console.log("\n--- TEST GROUP 2: Bulk Clear User Sessions ---");

    // Create 2 completed and 1 in-progress for user1
    const sUser1Comp1 = await prisma.interviewSession.create({
      data: { userId: testUser1.id, type: "HR", status: "COMPLETED" },
    });
    await prisma.interviewReport.create({
      data: { sessionId: sUser1Comp1.id, status: "READY", overallScore: 70 },
    });

    const sUser1Comp2 = await prisma.interviewSession.create({
      data: { userId: testUser1.id, type: "MANAGERIAL", status: "COMPLETED" },
    });
    await prisma.interviewReport.create({
      data: { sessionId: sUser1Comp2.id, status: "READY", overallScore: 75 },
    });

    const sUser1InProg = await prisma.interviewSession.create({
      data: { userId: testUser1.id, type: "DOMAIN", status: "IN_PROGRESS" },
    });

    // Create 1 session for user2 (must remain untouched!)
    const sUser2 = await prisma.interviewSession.create({
      data: { userId: testUser2.id, type: "DOMAIN", status: "COMPLETED" },
    });
    await prisma.interviewReport.create({
      data: { sessionId: sUser2.id, status: "READY", overallScore: 90 },
    });

    // Sub-test C: Clear "completed" only for User1
    console.log("Sub-test C: Clear 'completed' only");
    const clearCompletedRes = await InterviewDeletionService.clearUserSessions(testUser1.id, "completed");
    assert(clearCompletedRes.success === true && clearCompletedRes.count === 2, "Bulk cleared exactly 2 completed sessions for user 1");

    const user1SessionsAfterComp = await prisma.interviewSession.findMany({ where: { userId: testUser1.id } });
    assert(
      user1SessionsAfterComp.length === 1 && user1SessionsAfterComp[0].id === sUser1InProg.id,
      "Only user1's in-progress session remains"
    );

    const user2SessionCheck = await prisma.interviewSession.findUnique({ where: { id: sUser2.id } });
    assert(user2SessionCheck !== null, "User 2 session remains completely untouched");

    // Sub-test D: Clear "all" for User1
    console.log("Sub-test D: Clear 'all'");
    const clearAllRes = await InterviewDeletionService.clearUserSessions(testUser1.id, "all");
    assert(clearAllRes.success === true && clearAllRes.count === 1, "Bulk cleared remaining session for user 1");

    const user1SessionsAfterAll = await prisma.interviewSession.findMany({ where: { userId: testUser1.id } });
    assert(user1SessionsAfterAll.length === 0, "User 1 has 0 sessions remaining");

    // Clear when 0 sessions exist
    const clearEmptyRes = await InterviewDeletionService.clearUserSessions(testUser1.id, "all");
    assert(clearEmptyRes.success === true && clearEmptyRes.count === 0, "Clearing when empty returns count: 0");

    // Sub-test E: User 2 session still untouched
    const user2SessionFinalCheck = await prisma.interviewSession.findUnique({ where: { id: sUser2.id } });
    assert(user2SessionFinalCheck !== null, "User 2 session is verified still present after all User 1 operations");

    // Clean up User 2 session
    await InterviewDeletionService.deleteSession(sUser2.id, testUser2.id);

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${testPassed}/${testTotal} ASSERTIONS PASSED!`);
    console.log(`========================================\n`);
  } finally {
    // Cleanup test users
    await prisma.user.deleteMany({
      where: { id: { in: [testUser1.id, testUser2.id] } },
    });
  }
}

runTests()
  .then(() => {
    console.log("Test suite finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test suite failed:", err);
    process.exit(1);
  });
