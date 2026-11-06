"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ReportView, ReportPayload } from "@/components/report/ReportView";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, RefreshCw, ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";

type ReportStatus = "GENERATING" | "WAITING_FOR_EVALUATIONS" | "READY" | "PARTIAL" | "FAILED";

export default function InterviewReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchReport = useCallback(
    async (forceGenerate: boolean = false) => {
      if (!sessionId) return;

      try {
        const url = `/api/interview/${sessionId}/report${forceGenerate ? "?generate=true" : ""}`;
        const res = await fetch(url);
        const data = await res.json();

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (res.status === 403) {
          setErrorMessage("You do not have permission to view this interview report.");
          setStatus("FAILED");
          setLoading(false);
          return;
        }

        if (res.status === 404 && !forceGenerate) {
          // If report not found yet, attempt to generate
          return fetchReport(true);
        }

        if (!res.ok && res.status !== 200) {
          setErrorMessage(data?.message || "Failed to retrieve interview report.");
          setStatus("FAILED");
          setLoading(false);
          return;
        }

        const reportStatus = data.status as ReportStatus;
        setStatus(reportStatus);

        if (reportStatus === "READY" || reportStatus === "PARTIAL") {
          setReport(data.report);
          setLoading(false);
        } else if (reportStatus === "FAILED") {
          setErrorMessage(data?.message || "Deterministic report generation failed.");
          setLoading(false);
        } else {
          // WAITING_FOR_EVALUATIONS or GENERATING
          setLoading(false);
        }
      } catch (err: any) {
        console.error("[Report Fetch Error]:", err);
        setErrorMessage("Network error while connecting to the report service.");
        setLoading(false);
      }
    },
    [sessionId, router]
  );

  // Initial load
  useEffect(() => {
    fetchReport();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchReport]);

  // Polling effect for WAITING_FOR_EVALUATIONS or GENERATING
  useEffect(() => {
    if (status === "WAITING_FOR_EVALUATIONS" || status === "GENERATING") {
      pollTimerRef.current = setInterval(() => {
        setPollAttempt((prev) => prev + 1);
        fetchReport();
      }, 2000);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      };
    }
  }, [status, fetchReport]);

  // Gentle background poll if report is READY/PARTIAL but synthesis is still pending/generating
  useEffect(() => {
    if (
      (status === "READY" || status === "PARTIAL") &&
      report &&
      report.synthesisStatus &&
      report.synthesisStatus !== "SYNTHESIS_READY" &&
      report.synthesisStatus !== "SYNTHESIS_FAILED"
    ) {
      const backgroundTimer = setTimeout(() => {
        fetchReport();
      }, 4000);

      return () => clearTimeout(backgroundTimer);
    }
  }, [status, report, fetchReport]);

  // 1. Initial Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full p-8 rounded-2xl bg-surface border border-border text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          <h2 className="text-lg font-bold font-heading text-text-primary">Loading Report</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Retrieving interview evaluation data for session {sessionId?.slice(0, 8)}...
          </p>
        </div>
      </div>
    );
  }

  // 2. Waiting / Generating Polling Screen
  if (status === "WAITING_FOR_EVALUATIONS" || status === "GENERATING") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background animate-fade-in">
        <div className="max-w-md w-full p-8 rounded-2xl bg-surface border border-border text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>

          <div className="space-y-2">
            <Badge variant="neutral" className="text-xs font-mono">
              Status: {status}
            </Badge>
            <h2 className="text-xl font-bold font-heading text-text-primary">
              Processing Interview Evaluation
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {status === "WAITING_FOR_EVALUATIONS"
                ? "Background evaluation workers are completing individual turn assessments. Your comprehensive scores will display as soon as reconciliation completes."
                : "Aggregating pillar scores and computing deterministic difficulty trajectories..."}
            </p>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs text-text-secondary flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" /> Auto-checking status
            </span>
            <span className="font-mono text-[11px]">Poll #{pollAttempt + 1}</span>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {pollAttempt >= 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchReport(true)}
                className="text-xs font-medium text-primary hover:bg-primary/5 border-primary/20"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Finalize &amp; Refresh Report Now
              </Button>
            )}
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-xs text-text-secondary w-full">
                Return to Dashboard while waiting
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Failed State
  if (status === "FAILED" || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background animate-fade-in">
        <div className="max-w-md w-full p-8 rounded-2xl bg-surface border border-border text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>

          <div className="space-y-2">
            <Badge variant="error" className="text-xs font-mono">
              Report Generation Failed
            </Badge>
            <h2 className="text-xl font-bold font-heading text-text-primary">
              Unable to Display Report
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {errorMessage || "The interview report could not be generated at this time."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchReport(true);
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Retry Generation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (window.confirm("Permanently delete this interview session?")) {
                  try {
                    await fetch(`/api/interview/${sessionId}`, { method: "DELETE" });
                    router.push("/dashboard");
                  } catch (err) {
                    console.error("Failed to delete session:", err);
                  }
                }
              }}
              className="flex items-center gap-2 text-xs text-text-secondary hover:text-error hover:border-error/40"
            >
              <Trash2 className="w-4 h-4 text-error" /> Delete Session
            </Button>
            <Link href="/dashboard">
              <Button size="sm" variant="primary">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Ready or Partial Report View
  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-sky-200/30 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-between print:hidden pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Candidate Dashboard
          </Link>
        </div>

        <ReportView
          sessionId={sessionId}
          report={report}
          status={(status === "PARTIAL" ? "PARTIAL" : "READY") as "READY" | "PARTIAL"}
        />
      </div>
    </div>
  );
}
