"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Loader2, CheckCircle2, Clock } from "lucide-react";

export interface LearningRecommendationItem {
  skillGap: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  videoUrl: string;
  durationSeconds: number | null;
}

interface LearningRecommendationsCardProps {
  status?: string | null;
  recommendations?: LearningRecommendationItem[] | null;
  overallScore?: number | null;
}

function formatDuration(totalSeconds: number | null): string | null {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return null;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LearningRecommendationsCard({
  status,
  recommendations,
  overallScore,
}: LearningRecommendationsCardProps) {
  // FAILED, unknown, or missing status: render nothing (no error banner by design)
  if (!status || status === "FAILED") return null;

  if (status === "PENDING") {
    return (
      <div className="flex items-center gap-2 text-xs text-text-secondary px-1 print:hidden">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>Finding learning resources for you...</span>
      </div>
    );
  }

  if (status === "SKIPPED") {
    if (typeof overallScore !== "number") return null;
    return (
      <Card className="print:hidden">
        <CardContent>
          <div className="flex items-center gap-2 pt-4 text-sm text-text-secondary">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>No major skill gaps found — nothing to recommend here!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status !== "READY" || !recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="print:hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-red-500" />
          <CardTitle className="text-lg">Recommended Learning</CardTitle>
        </div>
        <CardDescription>
          Short videos picked to help you close the gaps found in this interview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec) => {
            const duration = formatDuration(rec.durationSeconds);
            return (
              <a
                key={rec.videoUrl}
                href={rec.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl bg-background border border-border/80 overflow-hidden hover:border-primary/40 transition-colors"
              >
                {rec.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rec.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-muted/40" />
                )}
                <div className="p-3 space-y-2 text-xs">
                  <Badge variant="neutral" className="text-[10px]">
                    {rec.skillGap}
                  </Badge>
                  <p className="font-semibold text-sm text-text-primary line-clamp-2 group-hover:text-primary transition-colors">
                    {rec.title}
                  </p>
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="truncate pr-2">{rec.channelName}</span>
                    {duration && (
                      <span className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                        <Clock className="w-3 h-3" />
                        {duration}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
