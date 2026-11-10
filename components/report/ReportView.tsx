"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Clock,
  MessageSquare,
  ArrowRight,
  Printer,
  Sparkles,
  Layers,
  ChevronRight,
  Quote,
  Trash2,
} from "lucide-react";
import {
  LearningRecommendationsCard,
  LearningRecommendationItem,
} from "@/components/report/learning-recommendations-card";

export interface TrajectoryPoint {
  turnSequenceNumber: number;
  previousDifficulty: string;
  newDifficulty: string;
  reason: string;
}

export interface PillarScoreItem {
  slug: string;
  name: string;
  score: number | null;
  masteryLevel: string | null;
  turnsEvaluated: number;
  demonstratedConcepts?: string[];
  identifiedGaps?: string[];
}

export interface SynthesisStrengthItem {
  title: string;
  description: string;
  evidenceTurn?: number | null;
  evidenceQuote?: string | null;
}

export interface SynthesisWeaknessItem {
  title: string;
  description: string;
  evidenceTurn?: number | null;
  evidenceQuote?: string | null;
}

export interface SynthesisTipItem {
  area: string;
  problem: string;
  specificAction: string;
  whyItMatters: string;
}

export interface ReportPayload {
  overallScore: number | null;
  overallPerformanceLevel: string;
  startingDifficulty: string;
  finalDifficulty: string;
  difficultyTrajectory: TrajectoryPoint[];
  metrics: {
    totalTurns: number;
    substantiveTurns: number;
    nonSubstantiveTurns: number;
    durationSeconds: number;
    unassessedTurns: number;
  } | null;
  pillarScores: PillarScoreItem[];
  reconciliation?: {
    status: string;
    totalJobs: number;
    completedCount: number;
    failedCount: number;
  } | null;
  synthesisStatus?: string | null;
  executiveSummary?: string | null;
  strengths?: SynthesisStrengthItem[];
  weaknesses?: SynthesisWeaknessItem[];
  actionableTips?: SynthesisTipItem[];
  recommendationsStatus?: string | null;
  recommendations?: LearningRecommendationItem[];
  createdAt: string;
}

interface ReportViewProps {
  sessionId: string;
  report: ReportPayload;
  status: "READY" | "PARTIAL";
}

function getPerformanceBadgeVariant(level: string): {
  colorClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
} {
  switch (level) {
    case "EXEMPLARY":
      return {
        colorClass: "text-emerald-700 dark:text-emerald-300",
        bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
        borderClass: "border-emerald-200 dark:border-emerald-800",
        label: "Exemplary",
      };
    case "COMPETENT":
      return {
        colorClass: "text-blue-700 dark:text-blue-300",
        bgClass: "bg-blue-50 dark:bg-blue-950/40",
        borderClass: "border-blue-200 dark:border-blue-800",
        label: "Competent",
      };
    case "DEVELOPING":
      return {
        colorClass: "text-amber-700 dark:text-amber-300",
        bgClass: "bg-amber-50 dark:bg-amber-950/40",
        borderClass: "border-amber-200 dark:border-amber-800",
        label: "Developing",
      };
    case "NEEDS_IMPROVEMENT":
      return {
        colorClass: "text-rose-700 dark:text-rose-300",
        bgClass: "bg-rose-50 dark:bg-rose-950/40",
        borderClass: "border-rose-200 dark:border-rose-800",
        label: "Needs Improvement",
      };
    default:
      return {
        colorClass: "text-muted-foreground",
        bgClass: "bg-muted/40",
        borderClass: "border-border",
        label: "Not Assessed",
      };
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function ReportView({ sessionId, report, status }: ReportViewProps) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const perfBadge = getPerformanceBadgeVariant(report.overallPerformanceLevel);
  const isPartial = status === "PARTIAL";

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/interview/${sessionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        router.push("/dashboard");
      } else {
        setDeleteError(data.message || "Failed to delete interview session.");
        setIsDeleting(false);
      }
    } catch (err) {
      console.error("[ReportView] Error deleting session:", err);
      setDeleteError("Network error while deleting interview session.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header / Score Overview Hero */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="neutral" className="text-xs font-mono">
                Session {sessionId.slice(0, 8)}
              </Badge>
              {isPartial && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Partial Evaluation
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary tracking-tight">
              Interview Performance Report
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Deterministic evaluation and qualitative analysis
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 text-xs text-text-secondary hover:text-error hover:border-error/40"
              title="Delete Interview & Report"
            >
              <Trash2 className="w-3.5 h-3.5 text-error" />
              Delete Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="flex items-center gap-2 text-xs"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </Button>
            <Link href="/dashboard">
              <Button size="sm" className="flex items-center gap-2 text-xs">
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Score & Trajectory Hero Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {/* Overall Score */}
          <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary" /> Overall Score
            </span>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl sm:text-4xl font-black text-text-primary font-heading">
                {report.overallScore !== null ? report.overallScore : "—"}
              </span>
              <span className="text-xs text-text-secondary font-medium">/ 100</span>
            </div>
            <div className="pt-2">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${perfBadge.bgClass} ${perfBadge.colorClass} ${perfBadge.borderClass}`}
              >
                {perfBadge.label}
              </span>
            </div>
          </div>

          {/* Difficulty Trajectory */}
          <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Difficulty Progression
            </span>
            <div className="flex items-center gap-2 pt-2 text-sm font-semibold text-text-primary">
              <span className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                {report.startingDifficulty}
              </span>
              <ChevronRight className="w-4 h-4 text-text-secondary" />
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-bold">
                {report.finalDifficulty}
              </span>
            </div>
            <p className="text-xs text-text-secondary pt-1">
              {report.difficultyTrajectory?.length || 0} tier adjustment
              {(report.difficultyTrajectory?.length || 0) === 1 ? "" : "s"}
            </p>
          </div>

          {/* Duration Metric */}
          <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" /> Session Duration
            </span>
            <div className="pt-1 text-2xl font-bold font-heading text-text-primary">
              {report.metrics ? formatDuration(report.metrics.durationSeconds) : "—"}
            </div>
            <p className="text-xs text-text-secondary pt-1">
              Active interview conversation
            </p>
          </div>

          {/* Turns Breakdown */}
          <div className="p-4 rounded-xl bg-background border border-border/80 space-y-1">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary" /> Answered Turns
            </span>
            <div className="pt-1 text-2xl font-bold font-heading text-text-primary">
              {report.metrics ? report.metrics.substantiveTurns : 0}
              <span className="text-xs text-text-secondary font-normal ml-1">
                / {report.metrics ? report.metrics.totalTurns : 0} total
              </span>
            </div>
            <p className="text-xs text-text-secondary pt-1">
              Substantive evaluated turns
            </p>
          </div>
        </div>
      </div>

      {/* Executive Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Executive Summary</CardTitle>
          </div>
          <CardDescription>
            High-level analytical overview grounded in deterministic interview evidence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.executiveSummary ? (
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
              {report.executiveSummary}
            </p>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/60 text-sm text-text-secondary">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span>
                Qualitative summary synthesis is processing in the background...
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pillar Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold font-heading text-text-primary">
            Competency Pillar Breakdown
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.pillarScores && report.pillarScores.length > 0 ? (
            report.pillarScores.map((pillar) => {
              const hasScore = pillar.score !== null;
              const pillarBadge = getPerformanceBadgeVariant(pillar.masteryLevel || "");

              return (
                <Card key={pillar.slug} className="flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {pillar.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {pillar.turnsEvaluated} turn
                          {pillar.turnsEvaluated === 1 ? "" : "s"} evaluated
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold font-heading text-text-primary">
                          {hasScore ? `${pillar.score}%` : "Unvisited"}
                        </span>
                        {pillar.masteryLevel && (
                          <div className="mt-1">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-medium border ${pillarBadge.bgClass} ${pillarBadge.colorClass} ${pillarBadge.borderClass}`}
                            >
                              {pillar.masteryLevel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Visual Score Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${hasScore ? Math.min(100, Math.max(0, pillar.score!)) : 0}%` }}
                      />
                    </div>

                    {/* Demonstrated Concepts */}
                    {pillar.demonstratedConcepts && pillar.demonstratedConcepts.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs font-medium text-text-secondary block mb-1">
                          Demonstrated Concepts
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {pillar.demonstratedConcepts.map((concept, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Identified Gaps */}
                    {pillar.identifiedGaps && pillar.identifiedGaps.length > 0 && (
                      <div className="pt-1">
                        <span className="text-xs font-medium text-text-secondary block mb-1">
                          Identified Growth Gaps
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {pillar.identifiedGaps.map((gap, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            >
                              {gap}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-2 p-6 rounded-xl bg-surface border border-border text-center text-sm text-text-secondary">
              No pillar breakdown data recorded for this session.
            </div>
          )}
        </div>
      </div>

      {/* Difficulty Trajectory History */}
      {report.difficultyTrajectory && report.difficultyTrajectory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Adaptive Difficulty Trajectory</CardTitle>
            </div>
            <CardDescription>
              Chronological log of difficulty shifts driven by consecutive performance streaks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.difficultyTrajectory.map((step, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-background border border-border/70 gap-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="neutral" className="font-mono text-xs">
                      Turn {step.turnSequenceNumber}
                    </Badge>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-text-secondary">{step.previousDifficulty}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                      <span className="text-primary font-bold">{step.newDifficulty}</span>
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary italic">
                    {step.reason}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Qualitative Feedback: Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Strengths */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-lg">Key Strengths</CardTitle>
            </div>
            <CardDescription>
              Demonstrated capabilities validated against interview transcripts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.strengths && report.strengths.length > 0 ? (
              report.strengths.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-background border border-border/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-text-primary">
                      {item.title}
                    </h4>
                    {item.evidenceTurn && (
                      <Badge variant="neutral" className="text-[10px] font-mono">
                        Turn {item.evidenceTurn}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                  {item.evidenceQuote && (
                    <div className="pt-1 flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200/50 dark:border-emerald-900/50">
                      <Quote className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="italic">&ldquo;{item.evidenceQuote}&rdquo;</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-text-secondary italic">
                {report.synthesisStatus === "SYNTHESIS_READY"
                  ? "No specific strengths isolated."
                  : "Synthesizing strengths from candidate responses..."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Growth Areas / Weaknesses */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <CardTitle className="text-lg">Growth Areas</CardTitle>
            </div>
            <CardDescription>
              Identified gaps and areas needing development
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.weaknesses && report.weaknesses.length > 0 ? (
              report.weaknesses.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-background border border-border/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-text-primary">
                      {item.title}
                    </h4>
                    {item.evidenceTurn && (
                      <Badge variant="neutral" className="text-[10px] font-mono">
                        Turn {item.evidenceTurn}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                  {item.evidenceQuote && (
                    <div className="pt-1 flex items-start gap-1.5 text-xs text-rose-700 dark:text-rose-300 font-mono bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200/50 dark:border-rose-900/50">
                      <Quote className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="italic">&ldquo;{item.evidenceQuote}&rdquo;</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-text-secondary italic">
                {report.synthesisStatus === "SYNTHESIS_READY"
                  ? "No major critical gaps identified."
                  : "Synthesizing growth opportunities from candidate responses..."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actionable Recommendations */}
      {report.actionableTips && report.actionableTips.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-lg">Actionable Recommendations</CardTitle>
            </div>
            <CardDescription>
              Targeted advice to level up performance in future interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.actionableTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-background border border-border/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-text-primary">
                      {tip.area}
                    </span>
                    <Badge variant="neutral" className="text-[10px]">
                      Tip #{idx + 1}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-text-secondary">
                    <p>
                      <strong className="text-text-primary">Issue:</strong> {tip.problem}
                    </p>
                    <p>
                      <strong className="text-text-primary">Action:</strong>{" "}
                      <span className="text-primary font-medium">{tip.specificAction}</span>
                    </p>
                    <p className="italic text-text-secondary/90">
                      <strong>Why:</strong> {tip.whyItMatters}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <LearningRecommendationsCard
        status={report.recommendationsStatus}
        recommendations={report.recommendations}
      />

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border print:hidden">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            ← Return to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-xs text-text-secondary hover:text-error hover:border-error/40 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-error" /> Delete Report
          </Button>
          <Link href="/interview">
            <Button size="sm" className="flex items-center gap-2">
              Start Another Interview
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Interview Session & Report?"
        description="Permanently delete this mock interview session and its evaluation report."
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-error/90 font-medium leading-relaxed">
            Warning: This action will permanently remove all conversation turns, turn evaluations, voice metrics, and this evaluation report from your account. You will be redirected to the candidate dashboard. This cannot be undone.
          </p>
          {deleteError && (
            <p className="text-xs text-error font-medium">{deleteError}</p>
          )}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
              loadingText="Deleting..."
            >
              Delete Interview
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
