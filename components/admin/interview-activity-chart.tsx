"use client";

import { useEffect, useState, useMemo } from "react";
import type { InterviewActivityStats } from "@/lib/admin/stats-queries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, Calendar } from "lucide-react";

export function InterviewActivityChart() {
  const [data, setData] = useState<InterviewActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; label: string; count: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchInterviewActivity() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/stats/interviews");
        const json = await res.json();

        if (!isMounted) return;

        if (res.ok && !json.error) {
          setData(json.data);
        } else {
          setError(json.message || "Failed to load interview activity.");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load interview activity.";
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchInterviewActivity();
    return () => {
      isMounted = false;
    };
  }, []);

  // Continuous 30-day timeline with zero-fill for presentation
  const timeline30Days = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.byDay) {
      data.byDay.forEach((item) => map.set(item.date, item.count));
    }

    const days: Array<{ date: string; label: string; count: number }> = [];
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const day = now.getUTCDate();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m, day - i));
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      days.push({
        date: dateStr,
        label,
        count: map.get(dateStr) || 0,
      });
    }
    return days;
  }, [data]);

  const maxDailyCount = useMemo(() => {
    const max = Math.max(...timeline30Days.map((d) => d.count), 1);
    return max;
  }, [timeline30Days]);

  const isEmpty =
    !data ||
    (data.byDay.length === 0 &&
      data.byType.length === 0 &&
      data.byDomain.length === 0 &&
      data.byStatus.length === 0);

  const totalInterviews = useMemo(() => {
    if (!data?.byType) return 0;
    return data.byType.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  if (loading) {
    return (
      <Card className="p-6 animate-pulse shadow-sm">
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
        <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        <div className="h-48 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
          <Activity className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white font-heading">
          No Interview Activity Yet
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Completed or in-progress mock interviews will appear here across HR, Aptitude, Managerial, and Domain tracks.
        </p>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
        <div>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Interview Activity Analytics
          </CardTitle>
          <CardDescription>
            30-day velocity timeline and breakdowns by interview type, domain, and completion status.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Badge variant="primary" className="text-xs">
            {totalInterviews} Total Sessions
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* SVG Day-Over-Day Timeline */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Daily Sessions (Last 30 Days)
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              {hoveredDay ? (
                <strong className="text-blue-600 dark:text-blue-400">
                  {hoveredDay.label}: {hoveredDay.count} session{hoveredDay.count === 1 ? "" : "s"}
                </strong>
              ) : (
                "Hover bar for daily count"
              )}
            </span>
          </div>

          {/* Bars Row */}
          <div className="w-full h-28 sm:h-32 flex items-end gap-1 sm:gap-1.5 pt-4">
            {timeline30Days.map((day) => {
              const heightPct = Math.max((day.count / maxDailyCount) * 100, day.count > 0 ? 8 : 2);
              const isHovered = hoveredDay?.date === day.date;
              return (
                <div
                  key={day.date}
                  className="flex-1 h-full flex items-end group cursor-pointer"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-sm transition-all duration-150 ${
                      day.count > 0
                        ? isHovered
                          ? "bg-blue-500 dark:bg-blue-400 shadow-sm shadow-blue-500/50"
                          : "bg-blue-600/80 dark:bg-blue-500/80 hover:bg-blue-500"
                        : "bg-slate-200/60 dark:bg-slate-800/80"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Labels Row */}
          <div className="w-full flex gap-1 sm:gap-1.5 pt-1.5">
            {timeline30Days.map((day, idx) => {
              const showLabel = idx % 7 === 0;
              let alignClass = "justify-center text-center";
              if (idx === 0) {
                alignClass = "justify-start text-left";
              } else if (idx >= 28) {
                alignClass = "justify-end text-right";
              }

              return (
                <div key={day.date} className={`flex-1 flex ${alignClass}`}>
                  {showLabel && (
                    <span className="text-[9px] text-slate-400 select-none whitespace-nowrap">
                      {day.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown Grid: Type, Domain, Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* By Type */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              By Track / Type
            </h5>
            <div className="space-y-2">
              {data?.byType.map((item) => {
                const pct = totalInterviews > 0 ? Math.round((item.count / totalInterviews) * 100) : 0;
                return (
                  <div key={item.type} className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.type}</span>
                      <span className="text-slate-500 font-mono">
                        {item.count} <span className="text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Domain */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              By Domain
            </h5>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {data?.byDomain.map((item, idx) => {
                const domainLabel = item.domain
                  ? item.domain.replace(/_/g, " ")
                  : "No domain (HR / Aptitude / Managerial)";
                const pct = totalInterviews > 0 ? Math.round((item.count / totalInterviews) * 100) : 0;
                return (
                  <div key={item.domain ?? `null-${idx}`} className="text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate font-medium ${
                          item.domain ? "text-slate-800 dark:text-slate-200" : "text-slate-400 italic"
                        }`}
                        title={domainLabel}
                      >
                        {domainLabel}
                      </span>
                      <span className="text-slate-500 font-mono shrink-0">
                        {item.count} <span className="text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Status */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              By Status
            </h5>
            <div className="space-y-2">
              {data?.byStatus.map((item) => {
                const pct = totalInterviews > 0 ? Math.round((item.count / totalInterviews) * 100) : 0;
                let badgeVariant: "success" | "warning" | "neutral" = "neutral";
                if (item.status === "COMPLETED") badgeVariant = "success";
                else if (item.status === "IN_PROGRESS") badgeVariant = "warning";

                return (
                  <div key={item.status} className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={badgeVariant} className="text-[10px] py-0 px-2">
                        {item.status}
                      </Badge>
                      <span className="text-slate-500 font-mono">
                        {item.count} <span className="text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.status === "COMPLETED"
                            ? "bg-emerald-500"
                            : item.status === "IN_PROGRESS"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
