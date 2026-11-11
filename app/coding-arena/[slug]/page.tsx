"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ResultsPanel,
  type ExecutionResultState,
  type JudgeData,
} from "@/components/coding/results-panel";
import { SubmissionsPanel } from "@/components/coding/submissions-panel";
import {
  formatDifficultyLabel,
  formatLanguageLabel,
  getDifficultyBadgeVariant,
} from "@/lib/coding-ui";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react";

const MAX_CODE_LENGTH = 20000;
const DRAFT_DEBOUNCE_MS = 500;
const EXECUTION_TIMEOUT_MS = 70000;

interface SampleTestCase {
  input: string;
  expectedOutput: string;
}

interface ProblemDetail {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  description: string;
  starterCode: Record<string, string>;
  sampleTests: SampleTestCase[];
}

function getLanguageExtensions(language: string): Extension[] {
  switch (language.toLowerCase()) {
    case "python":
      return [python()];
    case "javascript":
      return [javascript()];
    case "java":
      return [java()];
    default:
      return [];
  }
}

function getDraftStorageKey(problemId: string): string {
  return `coding-draft:${problemId}`;
}

function loadDraftsForStarter(
  problemId: string,
  starterCode: Record<string, string>
): Record<string, string> {
  const initial: Record<string, string> = { ...starterCode };
  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(problemId));
    if (!raw) return initial;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return initial;
    }
    const saved = parsed as Record<string, unknown>;
    for (const lang of Object.keys(starterCode)) {
      if (typeof saved[lang] === "string") {
        initial[lang] = saved[lang] as string;
      }
    }
  } catch {
    // Ignore localStorage / JSON errors (private mode or SSR)
  }
  return initial;
}

export default function CodingProblemPage() {
  const params = useParams();
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0] ?? ""
      : "";

  const [mounted, setMounted] = useState(false);
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(
    {}
  );

  const [submittingKind, setSubmittingKind] = useState<"run" | "submit" | null>(
    null
  );
  const [resultState, setResultState] = useState<ExecutionResultState | null>(
    null
  );
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [loadCodeNotice, setLoadCodeNotice] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const editorCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const fetchProblem = useCallback(async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setLoading(true);
    setNotFound(false);
    setError(null);
    setResultState(null);
    setExecutionError(null);
    setCooldownSeconds(0);
    setHistoryRefreshKey(0);
    setLoadCodeNotice(null);

    try {
      const res = await fetch(
        `/api/coding/problems/${encodeURIComponent(slug)}`
      );
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      if (!res.ok || json.error || !json.data) {
        setError(json?.message || "Failed to load coding problem.");
        return;
      }

      const data = json.data as ProblemDetail;
      const starterMap = data.starterCode || {};
      const languages = Object.keys(starterMap);

      setProblem(data);
      setCodeByLanguage(loadDraftsForStarter(data.id, starterMap));
      setSelectedLanguage((prev) =>
        prev && languages.includes(prev) ? prev : languages[0] ?? ""
      );
    } catch {
      setError("Failed to load coding problem. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    fetchProblem();
  }, [fetchProblem]);

  // Debounced draft persistence per problem
  useEffect(() => {
    if (!problem) return;
    const problemId = problem.id;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          getDraftStorageKey(problemId),
          JSON.stringify(codeByLanguage)
        );
      } catch {
        // Ignore localStorage write errors (private mode / quota)
      }
    }, DRAFT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [problem, codeByLanguage]);

  const availableLanguages = useMemo(
    () => (problem ? Object.keys(problem.starterCode || {}) : []),
    [problem]
  );

  const editorExtensions = useMemo(
    () => getLanguageExtensions(selectedLanguage),
    [selectedLanguage]
  );

  const currentCode = selectedLanguage
    ? codeByLanguage[selectedLanguage] ?? ""
    : "";
  const isCodeTooLong = currentCode.length > MAX_CODE_LENGTH;
  const isCodeEmpty =
    selectedLanguage.length > 0 && currentCode.trim().length === 0;
  const isActionDisabled =
    !problem ||
    !selectedLanguage ||
    submittingKind !== null ||
    cooldownSeconds > 0 ||
    currentCode.trim().length === 0 ||
    isCodeTooLong;

  const handleCodeChange = useCallback(
    (value: string) => {
      if (!selectedLanguage) return;
      setCodeByLanguage((prev) => ({
        ...prev,
        [selectedLanguage]: value,
      }));
    },
    [selectedLanguage]
  );

  const handleResetToStarter = useCallback(() => {
    if (!problem || !selectedLanguage) return;
    const starter = problem.starterCode[selectedLanguage] ?? "";
    setCodeByLanguage((prev) => {
      const updated = { ...prev, [selectedLanguage]: starter };
      try {
        window.localStorage.setItem(
          getDraftStorageKey(problem.id),
          JSON.stringify(updated)
        );
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, [problem, selectedLanguage]);

  const handleLoadCode = useCallback(
    (language: string, code: string) => {
      if (!availableLanguages.includes(language)) {
        setLoadCodeNotice(
          `Language "${formatLanguageLabel(language)}" is not available for this problem.`
        );
        return;
      }

      const existingCode =
        codeByLanguage[language] ?? problem?.starterCode?.[language] ?? "";
      if (
        existingCode !== code &&
        !window.confirm("Replace your current code with this submission?")
      ) {
        return;
      }

      setLoadCodeNotice(null);
      setSelectedLanguage(language);
      setCodeByLanguage((prev) => ({
        ...prev,
        [language]: code,
      }));
      editorCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [availableLanguages, codeByLanguage, problem]
  );

  const handleExecute = useCallback(
    async (kind: "run" | "submit") => {
      if (
        !problem ||
        !selectedLanguage ||
        inFlightRef.current ||
        cooldownSeconds > 0 ||
        currentCode.trim().length === 0 ||
        currentCode.length > MAX_CODE_LENGTH
      ) {
        return;
      }

      inFlightRef.current = true;
      setSubmittingKind(kind);
      setExecutionError(null);

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, EXECUTION_TIMEOUT_MS);

      try {
        const endpoint =
          kind === "run" ? "/api/coding/run" : "/api/coding/submit";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemId: problem.id,
            language: selectedLanguage,
            code: currentCode,
          }),
          signal: controller.signal,
        });

        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        if (res.status === 429) {
          const rawRetryAfter = res.headers.get("Retry-After");
          const parsed = rawRetryAfter
            ? Number.parseInt(rawRetryAfter, 10)
            : NaN;
          const waitSec =
            Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
          setCooldownSeconds(waitSec);
          return;
        }

        let json: {
          error?: boolean;
          message?: string;
          data?: JudgeData;
        } | null = null;
        try {
          json = await res.json();
        } catch {
          json = null;
        }

        if (!res.ok || !json || json.error || !json.data) {
          setExecutionError(
            json?.message || "Failed to execute code. Please try again."
          );
          return;
        }

        setResultState({
          kind,
          language: selectedLanguage,
          data: json.data,
        });
        if (kind === "submit") {
          setHistoryRefreshKey((prev) => prev + 1);
        }
      } catch (err: unknown) {
        if (timedOut) {
          setExecutionError("Request timed out. Please try again.");
        } else if (err instanceof DOMException && err.name === "AbortError") {
          // Aborted due to unmount or problem reload
        } else {
          setExecutionError(
            "Failed to execute code. Please check your connection and try again."
          );
        }
      } finally {
        clearTimeout(timeoutId);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        inFlightRef.current = false;
        setSubmittingKind(null);
      }
    },
    [problem, selectedLanguage, currentCode, cooldownSeconds, router]
  );

  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-purple-200/30 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm shadow-sm shadow-blue-500/25 shrink-0"
              title="Home"
            >
              AI
            </Link>
            <Link
              href="/coding-arena"
              className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Problems
            </Link>
          </div>
          <ThemeToggle />
        </div>

        {/* Loading / Not Found / Error / Content */}
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
              <span>Loading problem workspace...</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="animate-pulse h-[520px]">
                <CardHeader>
                  <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
                </CardContent>
              </Card>
              <Card className="animate-pulse h-[520px]">
                <CardHeader>
                  <div className="h-8 w-36 rounded bg-slate-200 dark:bg-slate-700" />
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : notFound ? (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                Problem not found
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                The coding problem you requested does not exist or could not be loaded.
              </p>
              <Link href="/coding-arena" className="inline-block">
                <Button variant="outline" size="sm">
                  Back to Problems
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : error || !problem ? (
          <Card className="border-rose-200/80 dark:border-rose-800/60">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  {error || "Failed to load coding problem."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchProblem}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Panel: Problem Description & Sample Examples */}
            <Card className="shadow-sm lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <CardTitle className="text-xl sm:text-2xl">
                    {problem.title}
                  </CardTitle>
                  <Badge variant={getDifficultyBadgeVariant(problem.difficulty)}>
                    {formatDifficultyLabel(problem.difficulty)}
                  </Badge>
                </div>
                {Array.isArray(problem.tags) && problem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {problem.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="neutral"
                        className="text-[11px] font-medium px-2 py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-sm leading-relaxed space-y-3 break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold font-heading text-slate-900 dark:text-white mt-4 mb-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold font-heading text-slate-900 dark:text-white mt-4 mb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-bold font-heading text-slate-900 dark:text-white mt-4 mb-1.5">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-3 mb-1">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="mb-2.5 last:mb-0 leading-relaxed text-slate-700 dark:text-slate-300">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-slate-900 dark:text-white">
                          {children}
                        </strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 my-2 space-y-1 text-slate-700 dark:text-slate-300">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-700 dark:text-slate-300">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      pre: ({ children }) => (
                        <pre className="p-3 my-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-xs overflow-x-auto border border-slate-200 dark:border-slate-800 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit [&_code]:rounded-none">
                          {children}
                        </pre>
                      ),
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-xs text-purple-700 dark:text-purple-300">
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-purple-500 pl-3 italic text-slate-600 dark:text-slate-400 my-2">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {problem.description}
                  </ReactMarkdown>
                </div>

                {/* Examples Section from sampleTests */}
                {Array.isArray(problem.sampleTests) &&
                  problem.sampleTests.length > 0 && (
                    <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700/60 space-y-3">
                      <h3 className="text-sm font-bold font-heading text-slate-900 dark:text-white">
                        Examples
                      </h3>
                      <div className="space-y-3">
                        {problem.sampleTests.map((test, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 space-y-2.5"
                          >
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              Sample Test {idx + 1}
                            </p>
                            <div className="space-y-1">
                              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Input
                              </span>
                              <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                                {test.input}
                              </pre>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Expected Output
                              </span>
                              <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                                {test.expectedOutput}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Right Panel: Language Picker, CodeMirror Editor, Action Buttons */}
            <div ref={editorCardRef}>
              <Card className="shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="language-select"
                    className="text-xs font-medium text-slate-500 dark:text-slate-400"
                  >
                    Language
                  </label>
                  <select
                    id="language-select"
                    aria-label="Select programming language"
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      setLoadCodeNotice(null);
                    }}
                    disabled={availableLanguages.length === 0}
                    className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    {availableLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {formatLanguageLabel(lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToStarter}
                  disabled={!selectedLanguage}
                  className="gap-1.5 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to starter
                </Button>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <CodeMirror
                  value={currentCode}
                  height="420px"
                  theme={mounted && resolvedTheme === "dark" ? "dark" : "light"}
                  extensions={editorExtensions}
                  basicSetup={{ lineNumbers: true }}
                  onChange={handleCodeChange}
                />
              </div>

              {isCodeEmpty && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Write some code before running or submitting.
                </p>
              )}

              {isCodeTooLong && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Code is {currentCode.length.toLocaleString()} characters
                    (exceeds the {MAX_CODE_LENGTH.toLocaleString()} character
                    server limit).
                  </span>
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActionDisabled}
                  onClick={() => handleExecute("run")}
                  className="gap-1.5"
                >
                  {submittingKind === "run" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Run
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isActionDisabled}
                  onClick={() => handleExecute("submit")}
                  className="gap-1.5"
                >
                  {submittingKind === "submit" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Submit
                </Button>
              </div>

              {submittingKind && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/30 px-3.5 py-2.5 text-xs sm:text-sm text-blue-700 dark:text-blue-300"
                >
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    {submittingKind === "run"
                      ? "Running against sample tests..."
                      : "Judging your solution... this can take up to a minute."}
                  </span>
                </div>
              )}

              {(cooldownSeconds > 0 || executionError) && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/80 dark:bg-rose-950/30 px-3.5 py-2.5 text-xs sm:text-sm text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {cooldownSeconds > 0
                      ? `Too many requests. Please wait ${cooldownSeconds}s and try again.`
                      : executionError}
                  </span>
                </div>
              )}
            </Card>
            </div>
            </div>

            {resultState && (
              <ResultsPanel
                result={resultState}
                selectedLanguage={selectedLanguage}
              />
            )}

            {loadCodeNotice && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{loadCodeNotice}</span>
              </p>
            )}

            <SubmissionsPanel
              problemId={problem.id}
              refreshKey={historyRefreshKey}
              onLoadCode={handleLoadCode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
