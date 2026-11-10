import { prisma } from "@/lib/prisma";
import { InterviewReport, ReportStatus, Prisma } from "@prisma/client";
import {
  DeterministicReportEngine,
  DeterministicReportPayload,
} from "./report-generator";
import { ReportSynthesizerService } from "./report-synthesizer";
import { EvaluationWorker } from "./evaluation-worker";

// ============================================================================
// PHASE 4A-2 REPORT PERSISTENCE TYPES
// ============================================================================

export interface ReportPersistenceOptions {
  /** If true, regenerates and updates even if an existing READY/PARTIAL report exists */
  forceRefresh?: boolean;
  /** Maximum wait time in milliseconds when waiting for a concurrent GENERATING lock */
  timeoutMs?: number;
}

export interface PersistenceResult {
  report: InterviewReport;
  isExisting: boolean;
  generatedAt: Date;
}

// ============================================================================
// REPORT PERSISTENCE SERVICE
// ============================================================================

export class ReportPersistenceService {
  /**
   * Primary entry point: Retrieves an existing report or atomically claims and
   * persists a new deterministic report for the interview session.
   *
   * GUARANTEES:
   * 1. Concurrency-Safe: Exactly 1 report record per session (DB UNIQUE constraint).
   * 2. Idempotent: Subsequent calls return the existing READY report without re-computation.
   * 3. Zero-Fabrication: If 0 turns evaluated, overallScore = null and NOT_ASSESSED.
   * 4. Zero LLM Calls: Purely deterministic persistence.
   * 5. Zero EvaluationJob Mutations: Never touches or alters EvaluationJob states.
   */
  static async getOrGenerateReport(
    sessionId: string,
    options: ReportPersistenceOptions = {},
    prismaClient: typeof prisma | Prisma.TransactionClient = prisma
  ): Promise<InterviewReport> {
    const timeoutMs = options.timeoutMs ?? 5000;

    // 1. Verify session exists
    const session = await prismaClient.interviewSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new Error(`Interview session not found: ${sessionId}`);
    }

    // 2. Check for existing report
    const existing = await prismaClient.interviewReport.findUnique({
      where: { sessionId },
    });

    if (existing && !options.forceRefresh) {
      // If report is already finalized, reuse immediately
      if (existing.status === "READY" || existing.status === "PARTIAL") {
        return existing;
      }

      // If existing is WAITING_FOR_EVALUATIONS, check if jobs have now finished
      if (existing.status === "WAITING_FOR_EVALUATIONS") {
        let reconciliation = await DeterministicReportEngine.reconcileEvaluationJobs(
          sessionId,
          prismaClient
        );
        if (!reconciliation.canAggregate) {
          // Actively drain pending / retrying jobs for this session
          try {
            await EvaluationWorker.drainSession(sessionId, 2000);
            reconciliation = await DeterministicReportEngine.reconcileEvaluationJobs(
              sessionId,
              prismaClient
            );
          } catch (drainErr) {
            console.error("[Report Persistence] Error draining pending evaluation jobs:", drainErr);
          }

          if (!reconciliation.canAggregate) {
            // Still waiting for remaining background evaluations
            return existing;
          }
        }
        // Jobs have finished! Proceed to update the existing row to READY/PARTIAL
        return this.executeAndPersistUpdate(sessionId, existing.id, prismaClient);
      }

      // If existing is GENERATING, wait for concurrent generator with timeout
      if (existing.status === "GENERATING") {
        const completedReport = await this.awaitConcurrentGeneration(
          sessionId,
          timeoutMs,
          prismaClient
        );
        if (completedReport) {
          return completedReport;
        }
        // If timed out, take over the generation
        return this.executeAndPersistUpdate(sessionId, existing.id, prismaClient);
      }
    }

    // 3. Atomic Claim: Create GENERATING record if not exists
    let reportRecord: InterviewReport;

    if (existing) {
      // Existing row being refreshed or retried
      reportRecord = await prismaClient.interviewReport.update({
        where: { id: existing.id },
        data: {
          status: "GENERATING",
          lastError: null,
          updatedAt: new Date(),
        },
      });
    } else {
      try {
        // Atomic insert: relies on PostgreSQL UNIQUE constraint on session_id
        reportRecord = await prismaClient.interviewReport.create({
          data: {
            sessionId,
            status: "GENERATING",
            scores: {},
            strengths: [],
            weaknesses: [],
            tips: [],
          },
        });
      } catch (err: any) {
        // P2002: Unique constraint violation (lost race to a concurrent generator)
        if (err.code === "P2002") {
          const concurrent = await this.awaitConcurrentGeneration(
            sessionId,
            timeoutMs,
            prismaClient
          );
          if (concurrent) {
            return concurrent;
          }
          // Fallback to reading whatever exists
          const fallback = await prismaClient.interviewReport.findUnique({
            where: { sessionId },
          });
          if (fallback) return fallback;
        }
        throw err;
      }
    }

    // 4. Execute deterministic calculation and persist final state
    return this.executeAndPersistUpdate(sessionId, reportRecord.id, prismaClient);
  }

  /**
   * Internal execution helper: calls Phase 4A-1 deterministic report engine
   * and updates the claimed database record atomically.
   */
  private static async executeAndPersistUpdate(
    sessionId: string,
    reportId: string,
    prismaClient: typeof prisma | Prisma.TransactionClient
  ): Promise<InterviewReport> {
    try {
      // Drain any pending jobs before deterministic calculation
      let reportData: DeterministicReportPayload =
        await DeterministicReportEngine.generateDeterministicReport(
          sessionId,
          prismaClient
        );

      if (reportData.status === "WAITING_FOR_EVALUATIONS") {
        try {
          await EvaluationWorker.drainSession(sessionId, 2000);
          reportData = await DeterministicReportEngine.generateDeterministicReport(
            sessionId,
            prismaClient
          );
        } catch (drainErr) {
          console.error("[Report Persistence] Error draining jobs during generation:", drainErr);
        }
      }

      let finalStatus: ReportStatus;
      if (reportData.status === "WAITING_FOR_EVALUATIONS") {
        finalStatus = "WAITING_FOR_EVALUATIONS";
      } else if (reportData.status === "PARTIAL") {
        finalStatus = "PARTIAL";
      } else {
        finalStatus = "READY";
      }

      // Persist full deterministic payload without fabricating any values
      const updated = await prismaClient.interviewReport.update({
        where: { id: reportId },
        data: {
          status: finalStatus,
          overallScore: reportData.overallScore,
          overallPerformanceLevel: reportData.overallPerformanceLevel,
          startingDifficulty: reportData.startingDifficulty,
          finalDifficulty: reportData.finalDifficulty,
          difficultyTrajectory: reportData.difficultyTrajectory as any,
          metrics: reportData.metrics as any,
          pillarScores: reportData.pillarScores as any,
          reconciliation: reportData.reconciliation as any,
          scores: {
            overallScore: reportData.overallScore,
            overallPerformanceLevel: reportData.overallPerformanceLevel,
            pillarScores: reportData.pillarScores,
          } as any,
          lastError: null,
          updatedAt: new Date(),
        },
      });

      // Automatic Qualitative Synthesis Trigger (Phase 4C)
      // When deterministic calculation reaches READY or PARTIAL, schedule qualitative synthesis
      if (finalStatus === "READY" || finalStatus === "PARTIAL") {
        setTimeout(() => {
          ReportPersistenceService.triggerSynthesisInBackground(sessionId);
        }, 100);
      }

      return updated;
    } catch (err: any) {
      // Diagnostic failure persistence without score fabrication
      const failed = await prismaClient.interviewReport.update({
        where: { id: reportId },
        data: {
          status: "FAILED",
          lastError: err?.message || "Deterministic report calculation failed",
          overallScore: null,
          overallPerformanceLevel: "NOT_ASSESSED",
          updatedAt: new Date(),
        },
      });

      return failed;
    }
  }

  /**
   * Awaits a concurrent GENERATING operation with a polling timeout.
   */
  private static async awaitConcurrentGeneration(
    sessionId: string,
    timeoutMs: number,
    prismaClient: typeof prisma | Prisma.TransactionClient
  ): Promise<InterviewReport | null> {
    const pollIntervalMs = 50;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const report = await prismaClient.interviewReport.findUnique({
        where: { sessionId },
      });

      if (report && report.status !== "GENERATING") {
        return report;
      }
    }

    return null;
  }

  /**
   * Read-only lookup of an existing report. Does not claim, create, or alter DB records.
   */
  static async getReport(
    sessionId: string,
    prismaClient: typeof prisma | Prisma.TransactionClient = prisma
  ): Promise<InterviewReport | null> {
    return prismaClient.interviewReport.findUnique({
      where: { sessionId },
    });
  }

  /**
   * Triggers qualitative synthesis in the background once deterministic calculation is READY.
   * Safe and non-blocking: handles duplicate/concurrent triggers via ReportSynthesizerService idempotency.
   */
  static triggerSynthesisInBackground(sessionId: string): void {
    ReportSynthesizerService.synthesizeReport(sessionId)
      .then((res) => {
        console.log(
          `[Auto-Synthesis Complete] Session ${sessionId} status: ${res.synthesisStatus}`
        );
      })
      .catch((err) => {
        if (err?.code === "P2025" || err?.message?.includes("not found")) {
          return; // Session or report was deleted before background synthesis executed
        }
        console.error(`[Auto-Synthesis Error] Session ${sessionId}:`, err);
      });
  }
}
