import { prisma } from "@/lib/prisma";
import { searchVideos } from "@/lib/youtube/client";
import { buildSearchQuery } from "@/lib/learning/query-builder";
import { pickBestVideo } from "@/lib/learning/curate";

const TOTAL_TIMEOUT_MS = 4000;
const MAX_GAPS = 3;

// Inflight set to avoid redundant concurrent generations for the same report
const inflightGenerations = new Set<string>();

interface Gap {
  topic: string;
  score: number; // lower = weaker; Infinity = unknown
}

/**
 * Builds skill gaps from pillarScores (available as soon as the report is READY).
 * Aptitude categories use the pillar/category name as the topic (per spec).
 * Gaps come ONLY from pillarScores.identifiedGaps (no fallback).
 */
function extractGaps(report: { pillarScores: unknown; weaknesses: unknown }): Gap[] {
  const gaps: Gap[] = [];
  const raw = report.pillarScores;
  const pillars: any[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw as Record<string, unknown>)
      : [];

  for (const p of pillars) {
    if (!p || typeof p !== "object") continue;
    const score = typeof p.score === "number" ? p.score : Number.POSITIVE_INFINITY;
    const found: string[] = Array.isArray(p.identifiedGaps)
      ? p.identifiedGaps.filter((g: unknown) => typeof g === "string" && g.trim().length > 0)
      : [];
    if (found.length === 0) continue;

    const isAptitude = typeof p.slug === "string" && p.slug.startsWith("APTITUDE_");
    if (isAptitude && typeof p.name === "string" && p.name.trim()) {
      gaps.push({ topic: p.name, score });
    } else {
      for (const g of found) gaps.push({ topic: g, score });
    }
  }

  // Dedupe by topic (case-insensitive), then sort weakest first
  const seen = new Set<string>();
  const unique = gaps.filter((g) => {
    const k = g.topic.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return unique.sort((a, b) => (a.score === b.score ? 0 : a.score < b.score ? -1 : 1));
}

async function setStatus(reportId: string, status: "READY" | "FAILED" | "SKIPPED") {
  await prisma.interviewReport.update({
    where: { id: reportId },
    data: { recommendationsStatus: status },
  });
}

export async function generateRecommendations(reportId: string): Promise<void> {
  if (inflightGenerations.has(reportId)) return;
  inflightGenerations.add(reportId);

  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const report = await prisma.interviewReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        pillarScores: true,
        weaknesses: true,
        recommendationsStatus: true,
      },
    });
    if (
      !report ||
      report.recommendationsStatus === "READY" ||
      report.recommendationsStatus === "SKIPPED"
    ) {
      return;
    }

    const gaps = extractGaps({
      pillarScores: report.pillarScores,
      weaknesses: report.weaknesses,
    });
    if (gaps.length === 0) {
      await setStatus(reportId, "SKIPPED");
      return;
    }

    const topGaps = gaps.slice(0, MAX_GAPS);

    const work = async () => {
      const picks = await Promise.all(
        topGaps.map(async (gap) => {
          const results = await searchVideos(buildSearchQuery(gap.topic), 3);
          return { gap: gap.topic, video: pickBestVideo(results) };
        })
      );

      // Dedupe by videoId, first gap wins; gaps with no video are skipped
      const seen = new Set<string>();
      const rows = [];
      for (const { gap, video } of picks) {
        if (!video || seen.has(video.videoId)) continue;
        seen.add(video.videoId);
        rows.push({
          reportId,
          skillGap: gap,
          videoId: video.videoId,
          title: video.title,
          channelName: video.channelName,
          thumbnailUrl: video.thumbnailUrl,
          videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          durationSeconds: video.durationSeconds,
        });
      }

      if (timedOut) return; // budget already blown; never write late results
      await prisma.$transaction([
        prisma.learningRecommendation.deleteMany({ where: { reportId } }),
        prisma.learningRecommendation.createMany({ data: rows }),
        prisma.interviewReport.update({
          where: { id: reportId },
          data: { recommendationsStatus: "READY" },
        }),
      ]);
    };

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error("learning-recommender timeout"));
      }, TOTAL_TIMEOUT_MS);
    });

    await Promise.race([work(), timeout]);
  } catch (err) {
    console.error("[learning-recommender] failed:", (err as Error).message);
    try {
      await setStatus(reportId, "FAILED");
    } catch {
      /* never throw out of this function */
    }
  } finally {
    if (timer) clearTimeout(timer);
    inflightGenerations.delete(reportId);
  }
}
