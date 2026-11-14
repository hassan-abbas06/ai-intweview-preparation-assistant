"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  PaginatedResult,
  UserDirectoryRow,
  UserDomainDistributionItem,
} from "@/lib/admin/user-directory-queries";
import { getDomainLabel } from "@/lib/constants/domains";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { UserDrilldownPanel } from "./user-drilldown-panel";

const PAGE_SIZE = 25;

export function UserDirectoryTable() {
  const [data, setData] = useState<PaginatedResult<UserDirectoryRow> | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [domainOptions, setDomainOptions] = useState<UserDomainDistributionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch domain options once on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchDomainOptions() {
      try {
        const res = await fetch("/api/admin/stats/domains");
        const json = await res.json();
        if (isMounted && res.ok && !json.error && Array.isArray(json.data?.distribution)) {
          setDomainOptions(json.data.distribution);
        }
      } catch {
        // If that call fails, keep just "All domains" and "Not set"
      }
    }
    fetchDomainOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch users when page, debouncedSearch, selectedDomain, or retryTrigger changes
  useEffect(() => {
    const controller = new AbortController();

    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));

        const trimmed = debouncedSearch.trim();
        if (trimmed) {
          params.set("search", trimmed);
        }
        if (selectedDomain) {
          params.set("domain", selectedDomain);
        }

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();

        if (res.ok && !json.error) {
          setData(json.data);
        } else {
          setError(json.message || "Failed to load user directory.");
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const msg = err instanceof Error ? err.message : "Failed to load user directory.";
        setError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      controller.abort();
    };
  }, [page, debouncedSearch, selectedDomain, retryTrigger]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    setPage(1);
  };

  const handleDomainChange = (val: string) => {
    setSelectedDomain(val);
    setPage(1);
  };

  const totalRows = data?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const rows = data?.rows ?? [];

  const notSetItem = domainOptions.find((d) => d.domain === null);
  const notSetCount = notSetItem?.count;

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Registered User Directory
              {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </CardTitle>
            <CardDescription>
              Directory of registered candidate accounts with activity metrics.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            <span>
              {debouncedSearch.trim() || selectedDomain ? "Matching users" : "Total users"}:{" "}
              <strong className="text-slate-900 dark:text-white font-mono">{totalRows}</strong>
            </span>
          </div>
        </CardHeader>

        {/* Filter Toolbar */}
        <div className="p-4 sm:px-6 border-y border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedDomain}
              onChange={(e) => handleDomainChange(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-colors"
              aria-label="Filter by domain"
            >
              <option value="">All domains</option>
              <option value="NOT_SET">
                Not set{notSetCount !== undefined ? ` (${notSetCount})` : ""}
              </option>
              {domainOptions
                .filter((d) => d.domain !== null)
                .map((item) => (
                  <option key={item.domain!} value={item.domain!}>
                    {item.label} ({item.count})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetryTrigger((t) => t + 1)}
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
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 sm:px-6">Email</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">2FA</th>
                    <th className="py-3 px-4 text-center">Interviews</th>
                    <th className="py-3 px-4 text-center">ATS Scans</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Joined</th>
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
                          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-14 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-4 w-8 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-4 w-8 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <p className="text-sm font-medium">No users match your filters.</p>
                        <p className="text-xs mt-1">Try clearing your search query or selecting a different domain.</p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((user) => {
                      const domainText = user.domain ? getDomainLabel(user.domain) : "Not set";
                      const isNotSet = !user.domain;

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-blue-50/60 dark:hover:bg-slate-800/80 cursor-pointer transition-colors focus:outline-none focus:bg-blue-50/70 dark:focus:bg-slate-800/90 group"
                          role="button"
                          tabIndex={0}
                          aria-label={`View activity for ${user.email}`}
                          onClick={() => setSelectedUserId(user.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedUserId(user.id);
                            }
                          }}
                        >
                          <td className="py-3.5 px-4 sm:px-6 font-mono text-slate-900 dark:text-slate-100 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{user.email}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {isNotSet ? (
                              <span className="text-slate-400 italic">Not set</span>
                            ) : (
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {domainText}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={user.role === "PREMIUM" ? "primary" : "secondary"}
                              className="w-fit"
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={user.twoFactorEnabled ? "success" : "neutral"}
                              className="flex items-center gap-1 w-fit"
                            >
                              {user.twoFactorEnabled ? (
                                <>
                                  <ShieldCheck className="w-3 h-3" /> Enabled
                                </>
                              ) : (
                                <>
                                  <ShieldAlert className="w-3 h-3 text-slate-400" /> Disabled
                                </>
                              )}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                            {user.interviewCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                            {user.atsScanCount}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
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
