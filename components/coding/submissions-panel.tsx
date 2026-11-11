"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResultsPanel,
  type TestResult,
} from "@/components/coding/results-panel";
import {
  formatLanguageLabel,
  formatStatusLabel,
  getStatusBadgeVariant,
} from "@/lib/coding-ui";
import {
  AlertCircle,
  Clock,
  Code2,
  History,
  Loader2,
  RefreshCw,
} from "lucide-react";

const PAGE_LIMIT = 10;

interface SubmissionSummary {
  id: string;
  problemId: string;
  language: string;
  status: string;
  runtimeMs: number;
  createdAt: string;
}

interface SubmissionsListData {
  submissions: SubmissionSummary[];
  nextCursor: string | null;
}

interface SubmissionDetail {
  id: string;
  problemId: string;
  language: string;
  code: string;
  status: string;
  testResults: unknown;
  runtimeMs: number;
  createdAt: string;
}

export interface SubmissionsPanelProps {
  problemId: string;
  refreshKey: number;
  onLoadCode: (language: string, code: string) => void;
}

function formatCreatedAt(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString();
}

function normalizeTestResults(raw: unknown): TestResult[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalized: TestResult[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const entry = item as Record<string, unknown>;
    if (entry.hidden === true) {
      normalized.push({
        label:
          typeof entry.label === "string" && entry.label
            ? entry.label
            : "Hidden Test",
        hidden: true,
        passed: Boolean(entry.passed),
      });
    } else {
      normalized.push({
        label:
          typeof entry.label === "string" && entry.label
            ? entry.label
            : "Sample Test",
        hidden: false,
        input: typeof entry.input === "string" ? entry.input : "",
        expectedOutput:
          typeof entry.expectedOutput === "string" ? entry.expectedOutput : "",
        actualOutput:
          typeof entry.actualOutput === "string" ? entry.actualOutput : "",
        passed: Boolean(entry.passed),
        runtimeMs:
          typeof entry.runtimeMs === "number" && Number.isFinite(entry.runtimeMs)
            ? entry.runtimeMs
            : 0,
      });
    }
  }
  return normalized;
}

export function SubmissionsPanel({
  problemId,
  refreshKey,
  onLoadCode,
}: SubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const detailRequestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // Reset selected detail whenever switching to a different problem
  useEffect(() => {
    detailAbortRef.current?.abort();
    detailAbortRef.current = null;
    detailRequestIdRef.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
  }, [problemId]);

  // Fetch initial submissions list (reset list whenever problemId, refreshKey, or retryTick changes)
  useEffect(() => {
    listAbortRef.current?.abort();
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    loadingMoreRef.current = false;

    const controller = new AbortController();
    listAbortRef.current = controller;

    setSubmissions([]);
    setNextCursor(null);
    setListLoading(true);
    setListError(null);
    setLoadingMore(false);
    setLoadMoreError(null);

    async function loadInitialList() {
      try {
        const params = new URLSearchParams({
          problemId,
          limit: String(PAGE_LIMIT),
        });
        const res = await fetch(
          `/api/coding/submissions?${params.toString()}`,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        if (res.status === 401) {
          window.location.assign("/login");
          return;
        }

        let json: {
          error?: boolean;
          message?: string;
          data?: SubmissionsListData;
        } | null = null;
        try {
          json = await res.json();
        } catch {
          json = null;
        }

        if (controller.signal.aborted) return;

        if (
          !res.ok ||
          !json ||
          json.error ||
          !json.data ||
          !Array.isArray(json.data.submissions)
        ) {
          setListError(json?.message || "Failed to load submissions.");
          return;
        }

        setSubmissions(json.data.submissions);
        setNextCursor(
          typeof json.data.nextCursor === "string" ? json.data.nextCursor : null
        );
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setListError("Failed to load submissions. Please try again.");
      } finally {
        if (!controller.signal.aborted) {
          setListLoading(false);
        }
      }
    }

    loadInitialList();

    return () => {
      controller.abort();
    };
  }, [problemId, refreshKey, retryTick]);

  // Abort all in-flight requests on unmount
  useEffect(() => {
    return () => {
      listAbortRef.current?.abort();
      loadMoreAbortRef.current?.abort();
      detailAbortRef.current?.abort();
    };
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    try {
      const params = new URLSearchParams({
        problemId,
        limit: String(PAGE_LIMIT),
        cursor: nextCursor,
      });
      const res = await fetch(`/api/coding/submissions?${params.toString()}`, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }

      let json: {
        error?: boolean;
        message?: string;
        data?: SubmissionsListData;
      } | null = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (controller.signal.aborted) return;

      if (res.status === 400) {
        setLoadMoreError(
          json?.message || "Unable to load more submissions (invalid cursor)."
        );
        setNextCursor(null);
        return;
      }

      if (
        !res.ok ||
        !json ||
        json.error ||
        !json.data ||
        !Array.isArray(json.data.submissions)
      ) {
        setLoadMoreError(json?.message || "Failed to load more submissions.");
        return;
      }

      const incoming = json.data.submissions;
      const newCursor =
        typeof json.data.nextCursor === "string" ? json.data.nextCursor : null;

      setSubmissions((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const unique = incoming.filter((item) => !seen.has(item.id));
        return [...prev, ...unique];
      });
      setNextCursor(newCursor);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setLoadMoreError("Failed to load more submissions. Please try again.");
    } finally {
      if (!controller.signal.aborted) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [problemId, nextCursor]);

  const handleSelectSubmission = useCallback(async (id: string) => {
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;

    const requestId = ++detailRequestIdRef.current;

    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const res = await fetch(
        `/api/coding/submissions/${encodeURIComponent(id)}`,
        { signal: controller.signal }
      );

      if (requestId !== detailRequestIdRef.current || controller.signal.aborted) {
        return;
      }

      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (res.status === 404) {
        setDetailError("Submission not found.");
        return;
      }

      let json: {
        error?: boolean;
        message?: string;
        data?: SubmissionDetail;
      } | null = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (requestId !== detailRequestIdRef.current || controller.signal.aborted) {
        return;
      }

      if (!res.ok || !json || json.error || !json.data) {
        setDetailError(json?.message || "Failed to load submission details.");
        return;
      }

      setDetail(json.data);
    } catch (err: unknown) {
      if (
        requestId !== detailRequestIdRef.current ||
        (err instanceof DOMException && err.name === "AbortError")
      ) {
        return;
      }
      setDetailError("Failed to load submission details. Please try again.");
    } finally {
      if (requestId === detailRequestIdRef.current && !controller.signal.aborted) {
        setDetailLoading(false);
      }
    }
  }, []);

  const normalizedDetailResults = detail
    ? normalizeTestResults(detail.testResults)
    : [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <CardTitle className="text-base sm:text-lg">My Submissions</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {listLoading ? (
          <div className="flex items-center gap-2 py-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
            <span>Loading submissions...</span>
          </div>
        ) : listError ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{listError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRetryTick((prev) => prev + 1)}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          </div>
        ) : submissions.length === 0 ? (
          <p className="py-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            No submissions yet for this problem.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {submissions.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectSubmission(item.id)}
                    className={`w-full text-left flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-colors ${
                      isSelected
                        ? "border-purple-400 dark:border-purple-500 bg-purple-50/70 dark:bg-purple-950/30"
                        : "border-slate-200/80 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {formatStatusLabel(item.status)}
                      </Badge>
                      <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100">
                        {formatLanguageLabel(item.language)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        {item.runtimeMs} ms
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatCreatedAt(item.createdAt)}
                    </span>
                  </button>
                );
              })}
            </div>

            {loadMoreError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{loadMoreError}</span>
              </p>
            )}

            {nextCursor !== null && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="gap-1.5"
                >
                  {loadingMore && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Selected Submission Detail View */}
        {selectedId && (
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700/60 space-y-4">
            {detailLoading ? (
              <div className="flex items-center gap-2 py-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                <span>Loading submission details...</span>
              </div>
            ) : detailError ? (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{detailError}</span>
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <Code2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>
                      Submitted Code ({formatLanguageLabel(detail.language)})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onLoadCode(detail.language, detail.code)}
                  >
                    Load this code into editor
                  </Button>
                </div>

                <pre className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 max-h-72 overflow-auto whitespace-pre">
                  {detail.code}
                </pre>

                <ResultsPanel
                  result={{
                    kind: "submit",
                    language: detail.language,
                    data: {
                      id: detail.id,
                      overallStatus: detail.status,
                      results: normalizedDetailResults,
                      totalRuntimeMs: detail.runtimeMs,
                      createdAt: detail.createdAt,
                    },
                  }}
                  selectedLanguage={detail.language}
                />
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
