"use client";

import { useEffect, useState } from "react";
import type { UserDrilldown } from "@/lib/admin/stats-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  X,
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Video,
  FileText,
  Clock,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";

export interface UserDrilldownPanelProps {
  userId: string | null;
  onClose: () => void;
}

export function UserDrilldownPanel({ userId, onClose }: UserDrilldownPanelProps) {
  const [data, setData] = useState<UserDrilldown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();

    async function fetchUserDrilldown() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/users/${encodeURIComponent(userId as string)}/activity`, {
          signal: controller.signal,
        });

        const json = await res.json();

        if (res.status === 404) {
          setError("User not found.");
          return;
        }

        if (res.ok && !json.error) {
          setData(json.data);
        } else {
          setError(json.message || "Failed to load user activity.");
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          // Request aborted because a new userId was selected or unmounted
          return;
        }
        const msg = err instanceof Error ? err.message : "Failed to load user activity.";
        setError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchUserDrilldown();

    return () => {
      controller.abort();
    };
  }, [userId]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && userId) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [userId, onClose]);

  if (!userId) {
    return null;
  }

  const user = data?.user;
  const logins = data?.logins ?? [];
  const interviews = data?.interviews ?? [];
  const atsScans = data?.atsScans ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Modal Panel */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white">
                Candidate Activity Drill-down
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                ID: {userId}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-slate-500 animate-pulse font-medium">Loading candidate activity profile...</p>
            </div>
          ) : error ? (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white font-heading">{error}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {error === "User not found."
                  ? "The requested user ID does not exist in the candidate directory."
                  : "An unexpected error occurred while loading this user's records."}
              </p>
              <div className="mt-5">
                <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                  Close Drill-down
                </Button>
              </div>
            </div>
          ) : user ? (
            <>
              {/* User Overview Profile Card */}
              <Card className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block uppercase font-medium">
                      Email Address
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white font-mono break-all text-sm mt-0.5 block">
                      {user.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block uppercase font-medium">
                      Selected Track Domain
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5 block">
                      {user.domain ? user.domain.replace(/_/g, " ") : "Not set"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block uppercase font-medium">
                      Two-Factor Auth
                    </span>
                    <div className="mt-1">
                      <Badge variant={user.twoFactorEnabled ? "success" : "neutral"} className="flex items-center gap-1 w-fit">
                        {user.twoFactorEnabled ? (
                          <>
                            <ShieldCheck className="w-3 h-3" /> Enabled
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3 h-3" /> Disabled
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block uppercase font-medium">
                      Account Registered
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono mt-1 block flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Interviews History Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" /> Mock Interview Sessions
                  </h4>
                  <Badge variant="neutral" className="font-mono text-[11px]">
                    {interviews.length} sessions
                  </Badge>
                </div>

                {interviews.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    No interview sessions found.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Domain</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Overall Score</th>
                          <th className="py-2.5 px-3 text-right">Started Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {interviews.map((session) => {
                          let badgeVariant: "success" | "warning" | "neutral" = "neutral";
                          if (session.status === "COMPLETED") badgeVariant = "success";
                          else if (session.status === "IN_PROGRESS") badgeVariant = "warning";

                          return (
                            <tr key={session.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                                {session.type}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                {session.domain ? session.domain.replace(/_/g, " ") : "—"}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant={badgeVariant} className="text-[10px] py-0 px-2">
                                  {session.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                {session.overallScore !== null
                                  ? `${session.overallScore % 1 === 0 ? session.overallScore : Number(session.overallScore.toFixed(1))}/100`
                                  : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {new Date(session.startedAt).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ATS Resume Scans Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" /> ATS Resume Scans
                  </h4>
                  <Badge variant="neutral" className="font-mono text-[11px]">
                    {atsScans.length} scans
                  </Badge>
                </div>

                {atsScans.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    No ATS scans found.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3">Scan Mode</th>
                          <th className="py-2.5 px-3 text-right">ATS Score</th>
                          <th className="py-2.5 px-3 text-right">Scanned Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {atsScans.map((scan) => {
                          const modeLabel = scan.mode === "job_targeted" ? "Job targeted" : "General";
                          return (
                            <tr key={scan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                                {modeLabel}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                {Math.round(scan.score)}/100
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {new Date(scan.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Login Audit Trail Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" /> Recent Authentication Attempts
                  </h4>
                  <Badge variant="neutral" className="font-mono text-[11px]">
                    {logins.length} recent
                  </Badge>
                </div>

                {logins.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
                    No login records found for this user.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm">
                        <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Result</th>
                          <th className="py-2.5 px-3 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {logins.map((login, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {login.method}
                            </td>
                            <td className="py-2 px-3">
                              <Badge variant={login.success ? "success" : "error"} className="text-[10px] py-0 px-2">
                                {login.success ? "Success" : "Failed"}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(login.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs px-4">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
