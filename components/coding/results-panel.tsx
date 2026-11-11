"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatLanguageLabel,
  formatStatusLabel,
  getStatusBadgeVariant,
} from "@/lib/coding-ui";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Terminal,
  XCircle,
} from "lucide-react";

export interface SampleResult {
  label: string;
  hidden: false;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  runtimeMs: number;
}

export interface HiddenResult {
  label: string;
  hidden: true;
  passed: boolean;
}

export type TestResult = SampleResult | HiddenResult;

export interface JudgeData {
  id?: string;
  overallStatus: string;
  results: TestResult[];
  totalRuntimeMs: number;
  errorMessage?: string;
  message?: string;
  createdAt?: string;
}

export interface ExecutionResultState {
  kind: "run" | "submit";
  language: string;
  data: JudgeData;
}

interface ResultsPanelProps {
  result: ExecutionResultState;
  selectedLanguage: string;
}

function PassFailIcon({ passed }: { passed: boolean }) {
  if (passed) {
    return (
      <CheckCircle2
        className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
        aria-label="Passed"
      />
    );
  }
  return (
    <XCircle
      className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0"
      aria-label="Failed"
    />
  );
}

function SampleTestBlock({ test }: { test: SampleResult }) {
  return (
    <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PassFailIcon passed={test.passed} />
          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {test.label}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <Clock className="w-3 h-3" />
          {test.runtimeMs} ms
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Input
          </span>
          <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 max-h-40 min-h-[2.25rem] overflow-auto whitespace-pre-wrap">
            {test.input}
          </pre>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Expected
          </span>
          <pre className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 max-h-40 min-h-[2.25rem] overflow-auto whitespace-pre-wrap">
            {test.expectedOutput}
          </pre>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Your Output
          </span>
          <pre
            className={`p-2.5 rounded-lg border font-mono text-xs max-h-40 min-h-[2.25rem] overflow-auto whitespace-pre-wrap ${
              test.passed
                ? "bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60 text-rose-800 dark:text-rose-200"
            }`}
          >
            {test.actualOutput}
          </pre>
        </div>
      </div>
    </div>
  );
}

function HiddenTestRow({ test }: { test: HiddenResult }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/70">
      <PassFailIcon passed={test.passed} />
      <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
        {test.label}
      </span>
    </div>
  );
}

export function ResultsPanel({
  result,
  selectedLanguage,
}: ResultsPanelProps) {
  const { kind, language, data } = result;
  const totalCount = data.results.length;
  const passedCount = data.results.filter((r) => r.passed).length;
  const normalizedStatus = data.overallStatus.toUpperCase();
  const showPassSummary =
    kind === "submit" &&
    totalCount > 0 &&
    normalizedStatus !== "COMPILE_ERROR" &&
    normalizedStatus !== "PROVIDER_ERROR";
  const showLanguageMismatch =
    Boolean(selectedLanguage) && selectedLanguage !== language;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant={getStatusBadgeVariant(data.overallStatus)}>
              {formatStatusLabel(data.overallStatus)}
            </Badge>
            <Badge variant="neutral" className="text-[11px] font-medium">
              {kind === "run" ? "Run" : "Submission"}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              {data.totalRuntimeMs} ms
            </span>
          </div>

          {showPassSummary && (
            <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
              {passedCount} / {totalCount} tests passed
            </span>
          )}
        </div>

        {(showLanguageMismatch || (kind === "submit" && data.id)) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500 dark:text-slate-400">
            {showLanguageMismatch ? (
              <span>Results are for {formatLanguageLabel(language)}</span>
            ) : (
              <span />
            )}
            {kind === "submit" && data.id && (
              <span>Saved as submission {data.id}</span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {data.message && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{data.message}</span>
          </div>
        )}

        {data.errorMessage && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <Terminal className="w-3.5 h-3.5" />
              <span>Error Details</span>
            </div>
            <pre className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 font-mono text-xs text-rose-800 dark:text-rose-200 max-h-48 overflow-auto whitespace-pre-wrap">
              {data.errorMessage}
            </pre>
          </div>
        )}

        {data.results.length > 0 && (
          <div className="space-y-2.5">
            {data.results.map((test, idx) =>
              test.hidden ? (
                <HiddenTestRow key={`${test.label}-${idx}`} test={test} />
              ) : (
                <SampleTestBlock key={`${test.label}-${idx}`} test={test} />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
