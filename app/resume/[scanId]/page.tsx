"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Tag,
  Lightbulb,
} from "lucide-react";

interface AtsCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | "not_checked";
  weight: number;
  detail: string;
}

interface KeywordMatch {
  matchPercent: number;
  matched: string[];
  missing: string[];
  lowTrust?: boolean;
  inferredFromLlm?: string[];
}

interface BulletRewrite {
  original: string;
  improved: string;
  reason: string;
}

interface FormattingNote {
  checkId: string;
  whyItMatters: string;
}

interface JdGap {
  keyword: string;
  suggestion: string;
}

interface LlmSuggestions {
  bulletRewrites: BulletRewrite[];
  formattingNotes: FormattingNote[];
  jdGaps: JdGap[];
}

interface AtsSubScores {
  formatting: number;
  content: number;
}

interface ScanData {
  id: string;
  resumeId: string;
  fileName: string;
  mode: "JOB_TARGETED" | "GENERAL";
  score: number;
  rawScore: number;
  coverage: number;
  notChecked: string[];
  capReason: string | null;
  jdText: string | null;
  timestamp: string;
  subScores?: AtsSubScores | null;
  suggestions: {
    checks: AtsCheck[];
    keywords: KeywordMatch | null;
    llm: LlmSuggestions | null;
    coverage?: number;
    notChecked?: string[];
    capReason?: string | null;
    rawScore?: number;
    subScores?: AtsSubScores | null;
  };
}

function getCheckLabel(checkId: string, checks: AtsCheck[]): string {
  for (let i = 0; i < checks.length; i++) {
    if (checks[i].id === checkId) {
      return checks[i].label;
    }
  }
  return checkId;
}

const MIN_JD_KEYWORDS_TO_SCORE = 4;
const THRESHOLD_LOW_TRUST_KEYWORDS = 6;

export default function ResumeScanResultPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = (params?.scanId as string) || "";

  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState<ScanData | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [retryingSuggestions, setRetryingSuggestions] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "fail" | "warn" | "pass">("all");

  const loadScan = async () => {
    if (!scanId) return;

    try {
      setLoading(true);
      setIsNotFound(false);
      setLoadError(null);

      const res = await fetch(`/api/resume/${encodeURIComponent(scanId)}`);

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // Non-JSON response
      }

      if (res.status === 404) {
        setIsNotFound(true);
        return;
      }

      if (!res.ok || (json && json.error)) {
        const message =
          json && typeof json.message === "string" && json.message.trim().length > 0
            ? json.message.trim()
            : res.statusText || "Failed to load scan.";
        setLoadError({ status: res.status, message });
        return;
      }

      // ApiResponse format: { error: false, message: "...", data: { ... } }
      if (json && !json.error && json.data) {
        setScan(json.data);
      } else {
        setLoadError({
          status: res.status,
          message: "Scan response did not contain expected data payload.",
        });
      }
    } catch (err: any) {
      setLoadError({
        status: 0,
        message: err?.message || "Network error loading scan report.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScan();
  }, [scanId]);

  const handleRetrySuggestions = async () => {
    if (!scanId || retryingSuggestions) return;
    setRetryingSuggestions(true);
    setRetryMessage(null);
    try {
      const res = await fetch(`/api/resume/${encodeURIComponent(scanId)}/suggestions`, {
        method: "POST",
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // Non-JSON response
      }

      if (res.ok && json && !json.error) {
        if (json.data && json.data.llm) {
          setScan((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              suggestions: {
                ...prev.suggestions,
                llm: json.data.llm,
              },
            };
          });
          setRetryMessage(null);
        } else {
          setRetryMessage("Still unavailable. Try again in a minute.");
        }
      } else {
        const msg =
          (json && typeof json.message === "string" && json.message.trim()) ||
          "Still unavailable. Try again in a minute.";
        setRetryMessage(msg);
      }
    } catch {
      setRetryMessage("Still unavailable. Try again in a minute.");
    } finally {
      setRetryingSuggestions(false);
    }
  };

  const handleCopyImproved = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Loading ATS Scan Report...
        </p>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
            Scan Report Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            This ATS scan does not exist, or you do not have permission to view it.
          </p>
          <Button variant="primary" onClick={() => router.push("/resume")} className="w-full">
            Back to Resume Scanner
          </Button>
        </div>
      </div>
    );
  }

  if (loadError || !scan) {
    const errorText = loadError
      ? loadError.status > 0
        ? `Could not load scan (HTTP ${loadError.status}): ${loadError.message}`
        : `Could not load scan: ${loadError.message}`
      : "Could not load scan: unexpected error.";

    return (
      <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
            Could Not Load Scan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {errorText}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Button variant="outline" onClick={() => loadScan()} className="w-full">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
            <Button variant="primary" onClick={() => router.push("/resume")} className="w-full">
              Back to Scanner
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const checks = scan.suggestions?.checks || [];
  const keywords = scan.suggestions?.keywords || null;
  const keywordCount = keywords
    ? (keywords.matched ? keywords.matched.length : 0) +
      (keywords.missing ? keywords.missing.length : 0)
    : 0;
  const jdMatchCheck = checks.find((c) => c.id === "jd_match");
  const isJdMatchNotChecked = Boolean(jdMatchCheck && jdMatchCheck.status === "not_checked");
  const isNotScored = isJdMatchNotChecked || keywordCount < MIN_JD_KEYWORDS_TO_SCORE;
  const isKeywordLowTrust = Boolean(
    keywords && (keywords.lowTrust || keywordCount < THRESHOLD_LOW_TRUST_KEYWORDS)
  );
  const isLowTrust1to5 = !isNotScored && keywordCount >= 1 && keywordCount < THRESHOLD_LOW_TRUST_KEYWORDS;
  const inferredFromLlm = (keywords && Array.isArray(keywords.inferredFromLlm) ? keywords.inferredFromLlm : []) as string[];
  const hasInferredFromLlm = inferredFromLlm.length > 0;
  const llm = scan.suggestions?.llm || null;
  const isAllEmpty = Boolean(
    llm &&
      llm.bulletRewrites.length === 0 &&
      llm.formattingNotes.length === 0 &&
      llm.jdGaps.length === 0
  );
  const subScores = scan.subScores || scan.suggestions?.subScores || null;

  const failedChecks = [];
  const warnChecks = [];
  const passChecks = [];
  const notCheckedItems = [];

  for (let i = 0; i < checks.length; i++) {
    const c = checks[i];
    if (c.status === "fail") failedChecks.push(c);
    else if (c.status === "warn") warnChecks.push(c);
    else if (c.status === "pass") passChecks.push(c);
    else if (c.status === "not_checked") notCheckedItems.push(c);
  }

  const displayedChecks =
    activeTab === "fail"
      ? failedChecks
      : activeTab === "warn"
      ? warnChecks
      : activeTab === "pass"
      ? passChecks
      : checks;

  const scoreColor =
    scan.score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : scan.score >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  const scoreBg =
    scan.score >= 80
      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
      : scan.score >= 60
      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800";

  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors relative overflow-hidden">
      {/* Background glow decorations */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-60 -right-20 w-96 h-96 bg-emerald-200/30 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/resume"
              className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Scanner
            </Link>
          </div>
          <ThemeToggle />
        </div>

        {/* Header & Score Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant={scan.mode === "JOB_TARGETED" ? "primary" : "neutral"}
                  className="text-xs font-semibold"
                >
                  {scan.mode === "JOB_TARGETED" ? "Job-Targeted Scan" : "General ATS Audit"}
                </Badge>
                <span className="text-xs text-slate-400">
                  {new Date(scan.timestamp).toLocaleDateString()} at{" "}
                  {new Date(scan.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white truncate max-w-lg">
                {scan.fileName}
              </h1>
            </div>

            {/* Overall ATS Score Badge */}
            <div
              className={`flex flex-col items-center sm:items-end justify-center px-6 py-4 rounded-2xl border ${scoreBg} shrink-0`}
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ATS Score
                </p>
                <div className={`text-4xl sm:text-5xl font-black ${scoreColor}`}>
                  {scan.score}
                  <span className="text-lg text-slate-400 font-medium">/100</span>
                </div>
              </div>
              {subScores && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3 text-xs w-full justify-between sm:justify-end">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                      ATS formatting
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {subScores.formatting}%
                    </span>
                  </div>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                      Content strength
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {subScores.content}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Capped Score Notice */}
          {scan.capReason && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-semibold">Score Cap Applied</p>
                <p className="mt-0.5">
                  {scan.capReason}. Uncapped raw score was{" "}
                  <span className="font-semibold">{scan.rawScore}/100</span>.
                </p>
              </div>
            </div>
          )}

          {/* Coverage Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>
                Based on <span className="font-semibold">{scan.coverage}%</span> of standard ATS checks
                applicable to this file type.
              </span>
            </div>
            {scan.notChecked && scan.notChecked.length > 0 && (
              <span className="text-[11px] text-slate-400 italic">
                Skipped: {scan.notChecked.join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Keyword Match Section (Job-Targeted Only) */}
        {scan.mode === "JOB_TARGETED" && keywords && (
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-base font-semibold">
                    Job Description Keyword Overlap
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isNotScored ? (
                    <Badge variant="neutral" className="text-xs font-bold">
                      Not scored
                    </Badge>
                  ) : (
                    <>
                      <span className="text-xs text-slate-400">Match Rate:</span>
                      <Badge
                        variant={
                          isKeywordLowTrust
                            ? "neutral"
                            : keywords.matchPercent >= 70
                            ? "success"
                            : keywords.matchPercent >= 40
                            ? "warning"
                            : "error"
                        }
                        className="text-xs font-bold"
                      >
                        {keywords.matchPercent}%
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs">
                Comparison of keywords extracted from the target job post against your resume text.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isNotScored ? (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    We couldn't find enough recognizable skills in this job description, so the job match was not scored and this result is the same as a general scan. Paste the full posting, including the requirements section.
                  </p>
                </div>
              ) : (
                <>
                  {isLowTrust1to5 && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p>
                        Only {keywordCount} {keywordCount === 1 ? "keyword was" : "keywords were"} found in this job description, so the match rate may be unreliable. Paste the full posting, including the requirements section.
                      </p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isKeywordLowTrust
                          ? "bg-slate-400 dark:bg-slate-500"
                          : keywords.matchPercent >= 70
                          ? "bg-emerald-500"
                          : keywords.matchPercent >= 40
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, keywords.matchPercent))}%` }}
                    />
                  </div>

                  {/* Matched Keywords */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Matched Keywords (
                      {keywords.matched.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.matched.length > 0 ? (
                        keywords.matched.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                          >
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No matching keywords found</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Missing Job Keywords (
                      {keywords.missing.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.missing.length > 0 ? (
                        keywords.missing.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                          >
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {isKeywordLowTrust
                            ? "No missing keywords found, but too few keywords were extracted to judge alignment."
                            : "None - excellent alignment!"}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {hasInferredFromLlm && (
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  Some keywords were identified by AI from the job description text.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 2: Deterministic Findings Breakdown */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                Deterministic ATS Audit Findings
              </h2>
              <p className="text-xs text-slate-400">
                Rule-based checks executed directly on your parsed resume structure.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({checks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("fail")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === "fail"
                    ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-rose-600"
                }`}
              >
                Failed ({failedChecks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("warn")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === "warn"
                    ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-amber-600"
                }`}
              >
                Warnings ({warnChecks.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pass")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === "pass"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-emerald-600"
                }`}
              >
                Passed ({passChecks.length})
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {displayedChecks.map((check) => {
              const isPass = check.status === "pass";
              const isWarn = check.status === "warn";
              const isFail = check.status === "fail";
              const isNotChecked = check.status === "not_checked";

              return (
                <div
                  key={check.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isFail
                      ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60"
                      : isWarn
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60"
                      : isNotChecked
                      ? "bg-slate-50/40 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 text-slate-500"
                      : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isPass && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {isWarn && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                        {isFail && <XCircle className="w-5 h-5 text-rose-500" />}
                        {isNotChecked && <HelpCircle className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {check.label}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            (Weight: {check.weight} pts)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {check.detail}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={
                        isPass
                          ? "success"
                          : isWarn
                          ? "warning"
                          : isFail
                          ? "error"
                          : "neutral"
                      }
                      className="text-[11px] uppercase tracking-wider font-bold shrink-0"
                    >
                      {isNotChecked ? "NOT CHECKED" : check.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Grounded AI Suggestions */}
        <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Optimization Recommendations
              </div>
              <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                Actionable Bullet Rewrites & Advice
              </h2>
            </div>
            {llm === null && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetrySuggestions}
                disabled={retryingSuggestions}
                className="text-xs"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${
                    retryingSuggestions ? "animate-spin" : ""
                  }`}
                />
                Retry Suggestions
              </Button>
            )}
          </div>

          {isAllEmpty ? (
            <Card className="border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
              <CardContent className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No safe rewrites were found for this resume
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your resume text was analyzed, but no bullet points required changes or any generated rewrites did not meet strict anti-hallucination grounding criteria.
                </p>
              </CardContent>
            </Card>
          ) : llm === null ? (
            <Card className="border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
              <CardContent className="py-8 text-center space-y-3">
                <Lightbulb className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  AI suggestions are temporarily unavailable
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your deterministic ATS score ({scan.score}/100) and rule-based findings above are
                  100% accurate. You can retry generating LLM suggestions anytime.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRetrySuggestions}
                  disabled={retryingSuggestions}
                  className="mt-2"
                >
                  {retryingSuggestions ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Generating AI Suggestions...
                    </>
                  ) : (
                    "Generate AI Suggestions Now"
                  )}
                </Button>
                {retryMessage && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                    {retryMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Bullet Rewrites */}
              {llm.bulletRewrites.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      High-Impact Bullet Rewrites
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      AI-written &bull; Fill in [bracketed] placeholders with your actual results
                    </span>
                  </div>

                  <div className="space-y-3">
                    {llm.bulletRewrites.map((rewrite, idx) => (
                      <Card
                        key={idx}
                        className="border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs"
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Original Bullet */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Original Bullet
                            </span>
                            <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              &ldquo;{rewrite.original}&rdquo;
                            </p>
                          </div>

                          {/* Improved Bullet */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Recommended Rewrite
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyImproved(rewrite.improved, idx)}
                                className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                              {rewrite.improved}
                            </p>
                          </div>

                          {/* Reason */}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Why this is better:
                            </span>{" "}
                            {rewrite.reason}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Formatting & Parsing Notes */}
              {llm.formattingNotes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    ATS Parsing Explanations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {llm.formattingNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1"
                      >
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {getCheckLabel(note.checkId, checks)}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {note.whyItMatters}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Description Gaps */}
              {llm.jdGaps.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Target Job Alignment Recommendations
                  </h3>
                  <div className="space-y-2">
                    {llm.jdGaps.map((gap, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs flex items-start gap-2.5"
                      >
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold shrink-0 text-[11px]">
                          {gap.keyword}
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {gap.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
          <Link href="/resume">
            <Button variant="outline" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Scan Another Resume
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="primary" size="md">
              Proceed to Interview Practice
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
