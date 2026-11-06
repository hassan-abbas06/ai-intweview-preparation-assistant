"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ShieldCheck,
  ShieldAlert,
  LogOut,
  ArrowRight,
  UserCheck,
  Briefcase,
  FileText,
  Code2,
  Calendar,
  Award,
  Loader2,
  PlayCircle,
  BarChart3,
  Clock,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { getDomainLabel } from "@/lib/constants/domains";

interface SessionHistoryItem {
  id: string;
  type: string;
  domain: string | null;
  focusArea: string | null;
  difficulty: string;
  modality: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  report: {
    id: string;
    status: string;
    overallScore: number | null;
    overallPerformanceLevel: string;
    synthesisStatus: string | null;
  } | null;
}

export default function UserDashboardPage() {
  const { data: session, status } = useSession();
  const [interviewSessions, setInterviewSessions] = useState<SessionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const user = session?.user;

  const [sessionToDelete, setSessionToDelete] = useState<SessionHistoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearFilter, setClearFilter] = useState<"all" | "completed">("all");
  const [isClearing, setIsClearing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  async function handleDeleteSession() {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/interview/${sessionToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setInterviewSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
        setFeedbackMsg({
          type: "success",
          text: "Interview session and report successfully deleted.",
        });
        setSessionToDelete(null);
      } else {
        setFeedbackMsg({
          type: "error",
          text: data.message || "Failed to delete interview session.",
        });
      }
    } catch (err) {
      console.error("[Dashboard] Error deleting session:", err);
      setFeedbackMsg({
        type: "error",
        text: "Network error while deleting interview session.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleClearHistory() {
    setIsClearing(true);
    try {
      const res = await fetch(`/api/interview/history?filter=${clearFilter}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        if (clearFilter === "completed") {
          setInterviewSessions((prev) => prev.filter((s) => s.status !== "COMPLETED"));
        } else {
          setInterviewSessions([]);
        }
        setFeedbackMsg({
          type: "success",
          text: data.message || "Interview sessions cleared successfully.",
        });
        setIsClearModalOpen(false);
      } else {
        setFeedbackMsg({
          type: "error",
          text: data.message || "Failed to clear interview sessions.",
        });
      }
    } catch (err) {
      console.error("[Dashboard] Error clearing history:", err);
      setFeedbackMsg({
        type: "error",
        text: "Network error while clearing interview sessions.",
      });
    } finally {
      setIsClearing(false);
    }
  }

  useEffect(() => {
    async function loadHistory() {
      if (!session) return;
      try {
        const res = await fetch("/api/interview/history");
        const data = await res.json();
        if (res.ok && data.sessions) {
          setInterviewSessions(data.sessions);
        }
      } catch (err) {
        console.error("[Dashboard] Failed to fetch interview history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }

    if (status === "authenticated") {
      loadHistory();
    }
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <p className="text-sm text-text-secondary animate-pulse">Loading dashboard session...</p>
      </div>
    );
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "â€”";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] p-4 sm:p-6 transition-colors">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top bar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-border gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm shadow-sm shadow-blue-500/25 shrink-0" title="Home">
              AI
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-heading text-text-primary">Candidate Dashboard</h1>
              <p className="text-sm text-text-secondary mt-0.5">
                Welcome back, <span className="font-medium text-text-primary">{user?.email || "Candidate"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Profile & Security overview card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Account Profile</CardTitle>
                <Badge variant="secondary">{user?.role || "USER"}</Badge>
              </div>
              <CardDescription>Your registered candidate profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50 text-sm">
                <span className="text-text-secondary flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" /> Email
                </span>
                <span className="font-mono text-text-primary">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50 text-sm">
                <span className="text-text-secondary flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Target Track / Domain
                </span>
                <span className="font-medium text-text-primary">{getDomainLabel(user?.domain)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-text-secondary flex items-center gap-2">
                  {user?.twoFactorEnabled ? (
                    <ShieldCheck className="w-4 h-4 text-success" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-warning" />
                  )}
                  Two-Factor Authentication (TOTP)
                </span>
                {user?.twoFactorEnabled ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="warning">Optional / Disabled</Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-border flex justify-end">
              <Link href="/dashboard/settings/security">
                <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs">
                  Account & Security Settings <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Quick Security Summary Card */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-lg">Account Security</CardTitle>
              <CardDescription>Multi-factor protection status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-text-secondary leading-relaxed">
                Protect your mock interview data, evaluations, and performance reports with time-based one-time password (TOTP) 2FA compatible with Google Authenticator.
              </p>
            </CardContent>
            <CardFooter className="pt-4 border-t border-border">
              <Link href="/dashboard/settings/security" className="w-full">
                <Button variant={user?.twoFactorEnabled ? "outline" : "primary"} size="sm" className="w-full text-xs">
                  {user?.twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Feedback Alert Banner */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
              feedbackMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-error/10 border-error/30 text-error"
            }`}
          >
            <span className="font-medium">{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-xs font-semibold hover:underline ml-3 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Real Interview History & Reports Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-heading text-text-primary">
                Interview Sessions & Reports
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Past and ongoing interview rounds with deterministic evaluations
              </p>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              {interviewSessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-error hover:border-error/40"
                >
                  <Trash2 className="w-3.5 h-3.5 text-error" /> Clear All
                </Button>
              )}
              <Link href="/interview">
                <Button size="sm" className="flex items-center gap-2 text-xs">
                  <PlayCircle className="w-4 h-4" /> Start Interview
                </Button>
              </Link>
            </div>
          </div>

          {loadingHistory ? (
            <div className="p-8 rounded-2xl bg-surface border border-border text-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
              <p className="text-xs text-text-secondary">Loading your interview sessions...</p>
            </div>
          ) : interviewSessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {interviewSessions.map((item) => {
                const isCompleted = item.status === "COMPLETED";
                const hasReport = !!item.report;
                const hasScore = item.report && item.report.overallScore !== null;

                return (
                  <Card key={item.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="neutral" className="text-xs font-semibold">
                            {item.type}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] font-mono">
                            {item.difficulty}
                          </Badge>
                          {isCompleted ? (
                            <Badge variant="success" className="text-[11px]">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[11px]">
                              In Progress
                            </Badge>
                          )}
                          {item.modality === "VOICE" && (
                            <Badge variant="primary" className="text-[10px]">
                              Voice
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                          <span>{item.domain || item.focusArea || "General Round"}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Right column: Score, Action button & Delete */}
                      <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                        {hasScore ? (
                          <div className="text-right">
                            <div className="text-xl font-bold font-heading text-text-primary flex items-center gap-1">
                              <Award className="w-4 h-4 text-primary" />
                              {item.report?.overallScore}%
                            </div>
                            <span className="text-[11px] text-text-secondary capitalize">
                              {item.report?.overallPerformanceLevel?.toLowerCase().replace("_", " ")}
                            </span>
                          </div>
                        ) : isCompleted ? (
                          <div className="text-right text-xs text-text-secondary">
                            <span>Report Pending</span>
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <Link href={`/interview/${item.id}/report`}>
                              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs">
                                <BarChart3 className="w-3.5 h-3.5 text-primary" /> View Report
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/interview/${item.id}`}>
                              <Button size="sm" variant="primary" className="flex items-center gap-1.5 text-xs">
                                Resume <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSessionToDelete(item)}
                            className="p-2 h-8 w-8 text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
                            title="Delete Interview"
                            aria-label={`Delete interview ${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-text-primary">No Interview Sessions Yet</h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  Start your first mock interview to practice technical topics, experience adaptive difficulty, and receive evidence-grounded performance reports.
                </p>
              </div>
              <Link href="/interview">
                <Button size="sm" className="text-xs">
                  Start First Interview Round
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Platform Navigation Cards */}
        <div className="pt-2">
          <h2 className="text-lg font-bold font-heading text-text-primary mb-4">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary shrink-0" /> Mock Interview Engine
                  </CardTitle>
                  <Badge variant="success">Available Now</Badge>
                </div>
                <CardDescription>
                  Interactive AI-led technical & behavioral interviews with real-time feedback.
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Link href="/interview" className="w-full">
                  <Button variant="primary" size="sm" className="w-full text-xs shadow-soft">
                    Open Interview Hub
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" /> ATS Resume Scanner
                  </CardTitle>
                  <Badge variant="neutral">Coming Soon</Badge>
                </div>
                <CardDescription>
                  Upload your resume and get match scores, keyword gap analysis, and tailored fixes.
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Link href="/resume" className="w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Analyze Resume
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-primary shrink-0" /> Coding Arena
                  </CardTitle>
                  <Badge variant="neutral">Coming Soon</Badge>
                </div>
                <CardDescription>
                  Monaco-powered coding sandbox with automated test case evaluation.
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Link href="/coding-arena" className="w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Launch Arena
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Delete Single Session Confirmation Modal */}
        <Modal
          isOpen={!!sessionToDelete}
          onClose={() => !isDeleting && setSessionToDelete(null)}
          title="Delete Interview Session?"
          description="This will permanently delete this interview and its associated reports."
        >
          <div className="space-y-4 pt-1">
            {sessionToDelete && (
              <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Type & Domain:</span>
                  <span className="font-semibold text-text-primary">
                    {sessionToDelete.type} â€¢ {sessionToDelete.domain || sessionToDelete.focusArea || "General Round"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Difficulty & Status:</span>
                  <span className="font-mono text-text-primary">
                    {sessionToDelete.difficulty} â€¢ {sessionToDelete.status}
                  </span>
                </div>
                {sessionToDelete.report?.overallScore !== null && sessionToDelete.report?.overallScore !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Evaluation Score:</span>
                    <span className="font-bold text-primary">{sessionToDelete.report.overallScore}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Started:</span>
                  <span className="text-text-primary">{formatDate(sessionToDelete.createdAt)}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-error/90 font-medium leading-relaxed">
              Warning: All interview turns, evaluations, voice/response analytics, and generated reports for this session will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSession}
                isLoading={isDeleting}
                loadingText="Deleting..."
              >
                Delete Session
              </Button>
            </div>
          </div>
        </Modal>

        {/* Clear All / Completed Sessions Confirmation Modal */}
        <Modal
          isOpen={isClearModalOpen}
          onClose={() => !isClearing && setIsClearModalOpen(false)}
          title="Clear Interview History?"
          description="Select which interview sessions you want to clear permanently."
        >
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                Choose Deletion Scope:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setClearFilter("all")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    clearFilter === "all"
                      ? "border-primary bg-primary/5 text-text-primary ring-1 ring-primary"
                      : "border-border bg-surface text-text-secondary hover:border-border/80"
                  }`}
                >
                  <div className="font-semibold text-xs text-text-primary">All Sessions</div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    Deletes all {interviewSessions.length} sessions (both completed & in-progress)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setClearFilter("completed")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    clearFilter === "completed"
                      ? "border-primary bg-primary/5 text-text-primary ring-1 ring-primary"
                      : "border-border bg-surface text-text-secondary hover:border-border/80"
                  }`}
                >
                  <div className="font-semibold text-xs text-text-primary">Completed Only</div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    Deletes {interviewSessions.filter((s) => s.status === "COMPLETED").length} completed sessions & reports
                  </div>
                </button>
              </div>
            </div>

            <p className="text-xs text-error/90 font-medium leading-relaxed">
              Warning: All selected interview sessions and their corresponding reports will be permanently deleted. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearHistory}
                isLoading={isClearing}
                loadingText="Clearing..."
              >
                Confirm & Clear
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
