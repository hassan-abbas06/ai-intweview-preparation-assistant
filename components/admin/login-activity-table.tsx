"use client";

import { useEffect, useState, useCallback } from "react";
import type { PaginatedResult, LoginActivityRow } from "@/lib/admin/stats-queries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertCircle, Shield, User, Loader2 } from "lucide-react";
import { UserDrilldownPanel } from "./user-drilldown-panel";

const PAGE_SIZE = 25;

export function LoginActivityTable() {
  const [data, setData] = useState<PaginatedResult<LoginActivityRow> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchLogins = useCallback(async (currentPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/stats/logins?page=${currentPage}&pageSize=${PAGE_SIZE}`);
      const json = await res.json();

      if (res.ok && !json.error) {
        setData(json.data);
      } else {
        setError(json.message || "Failed to load login activity.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load login activity.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogins(page);
  }, [page, fetchLogins]);

  const totalRows = data?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const rows = data?.rows ?? [];

  return (
    <>
      <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            Login Activity Audit
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </CardTitle>
          <CardDescription>
            Audit log of authentication events across all candidate and administrative logins (zero IP logging).
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
          <span>
            Total entries: <strong className="text-slate-900 dark:text-white font-mono">{totalRows}</strong>
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error ? (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogins(page)}
                className="ml-auto text-xs"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Actor Email</th>
                  <th className="py-3 px-4">Actor Type</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {loading && rows.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-14 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      <p className="text-sm font-medium">No login activity records found.</p>
                      <p className="text-xs mt-1">Authentication attempts will be logged here automatically.</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const email = row.actor.email || "Unknown";
                    const isUser = row.actor.type === "user";
                    const isSuccess = row.success;
                    const canDrilldown = Boolean(row.actor.userId);

                    return (
                      <tr
                        key={row.id}
                        className={
                          canDrilldown
                            ? "hover:bg-blue-50/60 dark:hover:bg-slate-800/80 cursor-pointer transition-colors focus:outline-none focus:bg-blue-50/70 dark:focus:bg-slate-800/90 group"
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        }
                        role={canDrilldown ? "button" : undefined}
                        tabIndex={canDrilldown ? 0 : undefined}
                        aria-label={canDrilldown ? `View activity for ${email}` : undefined}
                        onClick={canDrilldown ? () => setSelectedUserId(row.actor.userId!) : undefined}
                        onKeyDown={
                          canDrilldown
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedUserId(row.actor.userId!);
                                }
                              }
                            : undefined
                        }
                      >
                        <td className="py-3.5 px-4 sm:px-6 font-mono text-slate-900 dark:text-slate-100 font-medium">
                          {canDrilldown ? (
                            <div className="flex items-center gap-1.5">
                              <span>{email}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                            </div>
                          ) : (
                            email
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={isUser ? "secondary" : "primary"}
                            className="flex items-center gap-1 w-fit"
                          >
                            {isUser ? <User className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                            {isUser ? "User" : "Admin"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {row.method}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={isSuccess ? "success" : "error"}>
                            {isSuccess ? "Success" : "Failed"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(row.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-900 dark:text-white font-medium">{page}</strong> of{" "}
            <strong className="text-slate-900 dark:text-white font-medium">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 text-xs px-3"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 text-xs px-3"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

      <UserDrilldownPanel
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
}
