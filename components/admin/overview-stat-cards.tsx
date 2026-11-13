"use client";

import { useEffect, useState } from "react";
import type { OverviewStats } from "@/lib/admin/stats-queries";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, Video, FileText, Award, AlertCircle } from "lucide-react";

export function OverviewStatCards() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOverview() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/stats/overview");
        const json = await res.json();

        if (!isMounted) return;

        if (res.ok && !json.error) {
          setStats(json.data);
        } else {
          setError(json.message || "Failed to load overview statistics.");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load overview statistics.";
        setError(msg);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-5 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded-md mt-2" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </Card>
    );
  }

  const cards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/60",
    },
    {
      title: "Active Today",
      value: stats?.activeToday ?? 0,
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/60",
    },
    {
      title: "Total Interviews",
      value: stats?.totalInterviews ?? 0,
      icon: Video,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/60",
    },
    {
      title: "Total ATS Scans",
      value: stats?.totalAtsScans ?? 0,
      icon: FileText,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/60",
    },
    {
      title: "Avg ATS Score",
      value:
        stats?.avgAtsScore === null || stats?.avgAtsScore === undefined
          ? "No data yet"
          : `${stats.avgAtsScore.toFixed(1)}%`,
      icon: Award,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/60",
      isRawText: stats?.avgAtsScore === null || stats?.avgAtsScore === undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <Card
            key={i}
            className="p-5 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-600"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl ${card.bgColor} ${card.color} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1">
              <p
                className={`font-heading font-extrabold text-slate-900 dark:text-white ${
                  card.isRawText ? "text-base font-semibold text-slate-500 dark:text-slate-400" : "text-2xl"
                }`}
              >
                {card.value}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
