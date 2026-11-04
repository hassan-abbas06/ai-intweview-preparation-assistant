import { prisma } from "../lib/prisma";
import { isCandidateRequestingToEnd, buildInterviewState } from "../lib/interview/state";
import { InterviewOrchestrator } from "../services/interview-engine";
import { ReportPersistenceService } from "../services/report-persistence";
import { InterviewDeletionService } from "../services/interview-deletion";

async function traceChatEndFlow() {
  console.log("==================================================================");
  console.log("TRACING REAL RUN: IN-CHAT INTERVIEW END -> REPORT GENERATION");
  console.log("==================================================================");

  let testUser: any = null;
  let testSession: any = null;

  try {
    // 1. Setup real user & session in DB
    testUser = await prisma.user.create({
      data: {
        email: `chat_end_trace_${Date.now()}@example.com`,
        domain: "BACKEND",
      },
    });

    testSession = await prisma.interviewSession.create({
      data: {
        userId: testUser.id,
        type: "DOMAIN",
        domain: "BACKEND",
        difficulty: "MID",
        status: "IN_PROGRESS",
      },
    });

    console.log(`[Step 1] Initialized Session: ${testSession.id} (Status: ${testSession.status})`);

    // 2. Candidate sends an ending message inside chat
    const candidateMessage = "Thank you Alex, let's wrap up and end the interview here.";
    console.log(`\n[Step 2] Candidate Message: "${candidateMessage}"`);

    const isEnding = isCandidateRequestingToEnd(candidateMessage);
    console.log(`  • isCandidateRequestingToEnd: ${isEnding} (Expected: true)`);
    if (!isEnding) throw new Error("Failed to detect candidate end intent!");

    // 3. Orchestrator Evaluates Decision
    const interviewState = buildInterviewState(
      {
        ...testSession,
        messages: [
          { role: "assistant", content: "Can you explain how database indexing works?" },
        ],
      },
      candidateMessage
    );

    const decision = InterviewOrchestrator.decideNextStep({
      state: interviewState,
      candidateMessage,
    });

    console.log(`\n[Step 3] InterviewOrchestrator Decision:`);
    console.log(`  • Action       : ${decision.action} (Expected: CONCLUDE_ROUND)`);
    console.log(`  • Reason Code  : ${decision.reasonCode} (Expected: CANDIDATE_REQUESTED_END)`);
    console.log(`  • Is Terminal  : ${decision.isTerminalTurn} (Expected: true)`);
    console.log(`  • Directive    : "${decision.directiveInstruction.slice(0, 100)}..."`);

    if (decision.action !== "CONCLUDE_ROUND" || !decision.isTerminalTurn) {
      throw new Error(`Unexpected action: ${decision.action}`);
    }

    // 4. Simulate assistant conclusion delivery
    const assistantConclusion = "Thank you for sharing your architectural background today! Best of luck with your next steps. [SESSION_COMPLETED]";
    const cleanAssistantText = assistantConclusion.replace(/\[SESSION_COMPLETED\]/g, "").trim();
    const isSessionEnded = assistantConclusion.includes("[SESSION_COMPLETED]");

    await prisma.interviewMessage.create({
      data: {
        sessionId: testSession.id,
        role: "user",
        content: candidateMessage,
      },
    });

    await prisma.interviewMessage.create({
      data: {
        sessionId: testSession.id,
        role: "assistant",
        content: cleanAssistantText,
      },
    });

    console.log(`\n[Step 4] Stream Route Delivery:`);
    console.log(`  • Clean Assistant Message: "${cleanAssistantText}"`);
    console.log(`  • isSessionEnded Signal  : ${isSessionEnded} (Sent in SSE 'done' event)`);

    // 5. Frontend receives isSessionEnded -> Calls POST /api/interview/[sessionId]/end flow
    console.log(`\n[Step 5] Triggering End Flow (POST /api/interview/${testSession.id}/end)...`);
    const t0 = Date.now();

    // Execute the exact end flow logic from app/api/interview/[sessionId]/end/route.ts
    const updatedSession = await prisma.interviewSession.update({
      where: { id: testSession.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Generate or fetch report via ReportPersistenceService
    const report = await ReportPersistenceService.getOrGenerateReport(testSession.id);
    const elapsedMs = Date.now() - t0;

    console.log(`  • Session Status Updated : ${updatedSession.status}`);
    console.log(`  • Completed At           : ${updatedSession.completedAt?.toISOString()}`);
    console.log(`  • Report Record ID       : ${report.id}`);
    console.log(`  • Report Status          : ${report.status}`);
    console.log(`  • Target Redirection URL : /interview/${testSession.id}/report`);
    console.log(`  • End Flow Latency       : ${elapsedMs}ms`);

    // 6. Verify Report Persistence
    const fetchedReport = await prisma.interviewReport.findUnique({
      where: { sessionId: testSession.id },
    });

    if (!fetchedReport) throw new Error("Report record not found in database!");
    console.log(`\n[Step 6] Verification in Database:`);
    console.log(`  ✓ Confirmed InterviewReport row exists in PostgreSQL`);
    console.log(`  ✓ Report Session ID: ${fetchedReport.sessionId}`);
    console.log(`  ✓ Overall Score    : ${fetchedReport.overallScore ?? "null (waiting for async evaluations)"}`);

    console.log("\n==================================================================");
    console.log("TRACE SUCCESSFUL: CHAT END -> END FLOW -> REPORT READY");
    console.log("==================================================================");
  } finally {
    // Cleanup
    if (testSession?.id) {
      await InterviewDeletionService.deleteSession(testSession.id, testUser.id).catch(() => {});
    }
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    console.log("[Cleanup] Test user and session cleaned up.");
  }
}

traceChatEndFlow();
