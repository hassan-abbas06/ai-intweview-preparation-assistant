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
  Sparkles,
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
          text: `Interview session ${sessionToDelete.id.slice(0, 8)} deleted successfully.`,
        });
        setSessionToDelete(null);
      } else {
        setFeedbackMsg({
          type: "error",
          text: data.message || "Failed to delete interview session.",
        });
      }
    } catch {
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
    } catch {
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F6F9FD] dark:bg-[#0B1320]">
        <p className="text-xs sm:text-sm text-slate-500 animate-pulse">Loading dashboard session...</p>
      </div>
    );
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "—";
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
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-sky-200/30 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Top Header Bar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200/80 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm shadow-sm shadow-blue-500/25 shrink-0" title="Home">
              AI
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white">Candidate Dashboard</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Welcome back, <span className="font-medium text-slate-900 dark:text-white">{user?.email || "Candidate"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 rounded-full px-4 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Profile & Security Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Account Profile</CardTitle>
                <Badge variant="secondary">{user?.role || "USER"}</Badge>
              </div>
              <CardDescription>Your registered candidate profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/60 text-xs sm:text-sm">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" /> Email
                </span>
                <span className="font-mono text-slate-900 dark:text-white">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/60 text-xs sm:text-sm">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" /> Target Track / Domain
                </span>
                <span className="font-medium text-slate-900 dark:text-white">{getDomainLabel(user?.domain)}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-xs sm:text-sm">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  {user?.twoFactorEnabled ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
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
            <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
              <Link href="/dashboard/settings/security">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs rounded-full">
                  Account & Security Settings <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Quick Security Summary Card */}
          <Card className="flex flex-col justify-between shadow-sm">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Account Security</CardTitle>
              <CardDescription>Multi-factor protection status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Protect your mock interview data, evaluations, and performance reports with time-based one-time password (TOTP) 2FA compatible with Google Authenticator.
              </p>
            </CardContent>
            <CardFooter className="pt-4 border-t border-slate-100 dark:border-slate-700/60">
              <Link href="/dashboard/settings/security" className="w-full">
                <Button variant={user?.twoFactorEnabled ? "outline" : "primary"} size="sm" className="w-full text-xs rounded-full">
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
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
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
              <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white">
                Interview Sessions & Reports
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Past and ongoing interview rounds with deterministic evaluations
              </p>
            </div>
            <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
              {interviewSessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 hover:border-rose-300 rounded-full"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Clear All
                </Button>
              )}
              <Link href="/interview">
                <Button size="sm" className="flex items-center gap-2 text-xs rounded-full shadow-sm shadow-blue-500/25 px-4">
                  <PlayCircle className="w-4 h-4" /> Start Interview
                </Button>
              </Link>
            </div>
          </div>

          {loadingHistory ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" />
              <p className="text-xs text-slate-500">Loading your interview sessions...</p>
            </div>
          ) : interviewSessions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3.5">
              {interviewSessions.map((item) => {
                const isCompleted = item.status === "COMPLETED";
                const hasScore = item.report && item.report.overallScore !== null;

                return (
                  <Card key={item.id} className="hover:border-blue-300 dark:hover:border-blue-600 transition-colors shadow-sm p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          <span>{item.domain || item.focusArea || "General Round"}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Right column: Score & Actions */}
                      <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700/60">
                        {hasScore ? (
                          <div className="text-right">
                            <div className="text-lg font-bold font-heading text-slate-900 dark:text-white flex items-center gap-1 justify-end">
                              <Award className="w-4 h-4 text-blue-600" />
                              {item.report?.overallScore}%
                            </div>
                            <span className="text-[10px] text-slate-500 capitalize">
                              {item.report?.overallPerformanceLevel?.toLowerCase().replace("_", " ")}
                            </span>
                          </div>
                        ) : isCompleted ? (
                          <div className="text-right text-xs text-slate-400">
                            <span>Report Pending</span>
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <Link href={`/interview/${item.id}/report`}>
                              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs rounded-full">
                                <BarChart3 className="w-3.5 h-3.5 text-blue-600" /> View Report
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/interview/${item.id}`}>
                              <Button size="sm" variant="primary" className="flex items-center gap-1.5 text-xs rounded-full">
                                Resume <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setSessionToDelete(item)}
                            className="p-2 h-8 w-8 rounded-full border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-300 transition-colors"
                            title="Delete Interview"
                            aria-label={`Delete interview ${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Interview Sessions Yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Start your first mock interview to practice technical topics, experience adaptive difficulty, and receive evidence-grounded performance reports.
                </p>
              </div>
              <Link href="/interview">
                <Button size="sm" className="text-xs rounded-full px-5">
                  Start First Interview Round
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Platform Features Row */}
        <div className="pt-2">
          <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white mb-4">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="hover:border-blue-300 dark:hover:border-blue-600 transition-colors shadow-sm flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <Badge variant="success">Available Now</Badge>
                </div>
                <CardTitle className="text-base mt-2">Mock Interview Engine</CardTitle>
                <CardDescription>
                  Interactive AI-led technical & behavioral interviews with token-by-token streaming.
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Link href="/interview" className="w-full">
                  <Button variant="primary" size="sm" className="w-full text-xs rounded-full">
                    Open Interview Hub
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors shadow-sm flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <Badge variant="success">Available Now</Badge>
                </div>
                <CardTitle className="text-base mt-2">ATS Resume Scanner</CardTitle>
                <CardDescription>
                  Upload your resume and get match scores, keyword gap analysis, and tailored fixes.
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Link href="/resume" className="w-full">
                  <Button variant="primary" size="sm" className="w-full text-xs rounded-full">
                    Analyze Resume
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="hover:border-purple-300 dark:hover:border-purple-600 transition-colors shadow-sm flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <Code2 className="w-4 h-4" />
                  </div>
                </div>
                <CardTitle className="text-base mt-2">Coding Arena</CardTitle>
                <CardDescription>
                  Monaco-powered coding sandbox with automated test case evaluation.
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Link href="/coding-arena" className="w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs rounded-full">
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
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Type & Domain:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {sessionToDelete.type} • {sessionToDelete.domain || sessionToDelete.focusArea || "General Round"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Difficulty & Status:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {sessionToDelete.difficulty} • {sessionToDelete.status}
                  </span>
                </div>
                {sessionToDelete.report?.overallScore !== null && sessionToDelete.report?.overallScore !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Evaluation Score:</span>
                    <span className="font-bold text-blue-600">{sessionToDelete.report.overallScore}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Started:</span>
                  <span className="text-slate-900 dark:text-white">{formatDate(sessionToDelete.createdAt)}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
              Warning: All interview turns, evaluations, voice/response analytics, and generated reports for this session will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSession}
                isLoading={isDeleting}
                loadingText="Deleting..."
                className="rounded-full"
              >
                Delete Session
              </Button>
            </div>
          </div>
        </Modal>

        {/* Clear All Sessions Modal */}
        <Modal
          isOpen={isClearModalOpen}
          onClose={() => !isClearing && setIsClearModalOpen(false)}
          title="Clear Interview History?"
          description="Select which interview sessions you want to clear permanently."
        >
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Choose Deletion Scope:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setClearFilter("all")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    clearFilter === "all"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 ring-1 ring-blue-500"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">All Sessions</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Deletes all {interviewSessions.length} sessions (both completed & in-progress)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setClearFilter("completed")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    clearFilter === "completed"
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 ring-1 ring-blue-500"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">Completed Only</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Deletes {interviewSessions.filter((s) => s.status === "COMPLETED").length} completed sessions & reports
                  </div>
                </button>
              </div>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
              Warning: All selected interview sessions and their corresponding reports will be permanently deleted. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearHistory}
                isLoading={isClearing}
                loadingText="Clearing..."
                className="rounded-full"
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