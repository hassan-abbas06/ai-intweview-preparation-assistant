"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatDifficultyLabel,
  getDifficultyBadgeVariant,
} from "@/lib/coding-ui";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ProblemListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  tags: string[];
}

type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";

const DIFFICULTY_FILTERS: { label: string; value: DifficultyFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Easy", value: "EASY" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Hard", value: "HARD" },
];

export default function CodingArenaPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [solvedProblemIds, setSolvedProblemIds] = useState<string[]>([]);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("ALL");

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgressLoaded(false);
    try {
      const [problemsRes, progressRes] = await Promise.all([
        fetch("/api/coding/problems"),
        fetch("/api/coding/progress").catch(() => null),
      ]);

      if (problemsRes.status === 401 || progressRes?.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await problemsRes.json();
      if (!problemsRes.ok || json.error || !Array.isArray(json.data)) {
        setError(json?.message || "Failed to load coding problems.");
        return;
      }

      let nextSolvedIds: string[] = [];
      let nextProgressLoaded = false;
      if (progressRes && progressRes.ok) {
        try {
          const progressJson = await progressRes.json();
          if (
            progressJson &&
            !progressJson.error &&
            Array.isArray(progressJson.data?.solvedProblemIds)
          ) {
            nextSolvedIds = progressJson.data.solvedProblemIds.filter(
              (id: unknown): id is string => typeof id === "string"
            );
            nextProgressLoaded = true;
          }
        } catch {
          // Silently treat invalid progress JSON as no solved info
        }
      }

      setProblems(json.data);
      setSolvedProblemIds(nextSolvedIds);
      setProgressLoaded(nextProgressLoaded);
    } catch {
      setError("Failed to load coding problems. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const solvedProblemSet = useMemo(
    () => new Set(solvedProblemIds),
    [solvedProblemIds]
  );

  const solvedCount = useMemo(
    () => problems.filter((p) => solvedProblemSet.has(p.id)).length,
    [problems, solvedProblemSet]
  );

  const filteredProblems = useMemo(() => {
    if (difficultyFilter === "ALL") return problems;
    return problems.filter(
      (p) => p.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
    );
  }, [problems, difficultyFilter]);

  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-purple-200/30 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
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
              href="/dashboard"
              className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
          <ThemeToggle />
        </div>

        {/* Title & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white">
                Coding Arena
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Choose a problem to write code, run sample tests, and submit your solution.
              </p>
              {!loading && !error && progressLoaded && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                  {solvedCount} / {problems.length} solved
                </p>
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-2 flex-wrap"
            role="group"
            aria-label="Filter problems by difficulty"
          >
            {DIFFICULTY_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                size="sm"
                variant={difficultyFilter === filter.value ? "primary" : "outline"}
                onClick={() => setDifficultyFilter(filter.value)}
                className="text-xs"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* States: Loading / Error / Empty / List */}
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
              <span>Loading coding problems...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <Card key={n} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <Card className="border-rose-200/80 dark:border-rose-800/60">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchProblems}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : problems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No problems available yet.
            </CardContent>
          </Card>
        ) : filteredProblems.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No problems match the selected difficulty.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProblems.map((problem) => (
              <Link
                key={problem.id}
                href={`/coding-arena/${problem.slug}`}
                className="block group"
              >
                <Card className="h-full flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-600 transition-colors shadow-sm">
                  <div>
                    <CardHeader className="mb-3">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base sm:text-lg group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {problem.title}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {solvedProblemSet.has(problem.id) && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Solved
                            </Badge>
                          )}
                          <Badge
                            variant={getDifficultyBadgeVariant(problem.difficulty)}
                          >
                            {formatDifficultyLabel(problem.difficulty)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(problem.tags) && problem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
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
                    </CardContent>
                  </div>
                  <CardFooter className="pt-3 mt-4 justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    <span>Open challenge</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
