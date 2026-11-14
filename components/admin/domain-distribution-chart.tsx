"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserDomainDistributionItem } from "@/lib/admin/user-directory-queries";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PieChart, AlertCircle, Loader2 } from "lucide-react";

interface DomainStatsResponse {
  distribution: UserDomainDistributionItem[];
  totalUsers: number;
}

export function DomainDistributionChart() {
  const [data, setData] = useState<DomainStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/stats/domains");
      const json = await res.json();

      if (res.ok && !json.error) {
        setData(json.data);
      } else {
        setError(json.message || "Failed to load domain distribution.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load domain distribution.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const totalUsers = data?.totalUsers ?? 0;
  const distribution = data?.distribution ?? [];

  if (loading) {
    return (
      <Card className="p-6 animate-pulse shadow-sm">
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
        <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDomains}
            className="text-xs shrink-0"
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (totalUsers === 0 || distribution.length === 0) {
    return (
      <Card className="p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
          <PieChart className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white font-heading">
          No Registered Users Yet
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Candidate domain distribution will appear here once candidates register and choose their track.
        </p>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
        <div>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Domain Distribution
          </CardTitle>
          <CardDescription>
            Candidate career track distribution across all registered accounts.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Badge variant="primary" className="text-xs">
            {totalUsers} Registered User{totalUsers === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {distribution.map((item, idx) => {
          const isNotSet = item.domain === null;
          const pct = totalUsers > 0 ? Math.round((item.count / totalUsers) * 100) : 0;

          return (
            <div key={item.domain ?? `null-${idx}`} className="text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`truncate ${
                    isNotSet
                      ? "text-slate-400 italic"
                      : "font-semibold text-slate-800 dark:text-slate-200"
                  }`}
                  title={item.label}
                >
                  {isNotSet ? "Not set" : item.label}
                </span>
                <span className="text-slate-500 font-mono shrink-0">
                  {item.count} <span className="text-[10px]">({pct}%)</span>
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isNotSet
                      ? "bg-slate-400 dark:bg-slate-600"
                      : "bg-blue-600 dark:bg-blue-500"
                  }`}
                  style={{ width: `${Math.max(pct, item.count > 0 ? 1 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
