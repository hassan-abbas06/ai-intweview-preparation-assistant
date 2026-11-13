"use client";

import { useEffect, useState, useMemo } from "react";
import type { AtsActivityStats } from "@/lib/admin/stats-queries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, AlertCircle, Calendar, Target } from "lucide-react";

export function AtsActivityChart() {
  const [data, setData] = useState<AtsActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; label: string; count: number } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAtsActivity() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/stats/ats-scans");
        const json = await res.json();

        if (!isMounted) return;

        if (res.ok && !json.error) {
          setData(json.data);
        } else {
          setError(json.message || "Failed to load ATS activity.");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load ATS activity.";
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAtsActivity();
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

  const totalScans = useMemo(() => {
    if (!data?.byMode) return 0;
    return data.byMode.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  const isEmpty =
    !data ||
    (totalScans === 0 &&
      data.scoreDistribution.every((b) => b.count === 0) &&
      data.byDay.length === 0);

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
        <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white font-heading">
          No ATS Scan Activity Yet
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Uploaded resumes and resume health scans will populate score distributions and scan mode statistics here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
        <div>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ATS Resume Scan Analytics
          </CardTitle>
          <CardDescription>
            30-day resume evaluation volume, scan mode breakdown, and three-tier score distribution.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Badge variant="warning" className="text-xs">
            {totalScans} Total Scans
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {/* SVG Day-Over-Day Timeline */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" /> Daily ATS Scans (Last 30 Days)
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              {hoveredDay ? (
                <strong className="text-amber-600 dark:text-amber-400">
                  {hoveredDay.label}: {hoveredDay.count} scan{hoveredDay.count === 1 ? "" : "s"}
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
                          ? "bg-amber-500 dark:bg-amber-400 shadow-sm shadow-amber-500/50"
                          : "bg-amber-500/80 dark:bg-amber-500/80 hover:bg-amber-400"
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

        {/* Breakdowns: Mode Breakdown & Score Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Mode Breakdown */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scan Mode Breakdown
            </h5>
            <div className="space-y-3">
              {data?.byMode.map((item) => {
                const label = item.mode === "job_targeted" ? "Job targeted" : "General";
                const pct = totalScans > 0 ? Math.round((item.count / totalScans) * 100) : 0;
                const isTargeted = item.mode === "job_targeted";

                return (
                  <div key={item.mode} className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Target className={`w-3.5 h-3.5 ${isTargeted ? "text-amber-600" : "text-teal-600"}`} />
                        {label}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {item.count} <span className="text-[10px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isTargeted ? "bg-amber-500" : "bg-teal-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Distribution (0-40, 40-70, 70-100) */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Score Distribution
            </h5>
            <div className="space-y-2.5">
              {data?.scoreDistribution.map((bucket) => {
                const pct = totalScans > 0 ? Math.round((bucket.count / totalScans) * 100) : 0;
                let colorClass = "bg-emerald-500";
                let textClass = "text-emerald-600 dark:text-emerald-400";
                let desc = "Strong ATS Match (70–100%)";

                if (bucket.bucket === "0-40") {
                  colorClass = "bg-rose-500";
                  textClass = "text-rose-600 dark:text-rose-400";
                  desc = "Needs Improvement (0–39%)";
                } else if (bucket.bucket === "40-70") {
                  colorClass = "bg-amber-500";
                  textClass = "text-amber-600 dark:text-amber-400";
                  desc = "Moderate Alignment (40–69%)";
                }

                return (
                  <div key={bucket.bucket} className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${textClass}`}>
                          {bucket.bucket}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
                          — {desc}
                        </span>
                      </div>
                      <span className="text-slate-600 dark:text-slate-300 font-mono font-medium">
                        {bucket.count} <span className="text-[10px] text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
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
