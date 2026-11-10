import type { YouTubeSearchResult } from "@/lib/youtube/client";

const MIN_SECONDS = 120;
const MAX_SECONDS = 2700;

export function pickBestVideo(results: YouTubeSearchResult[]): YouTubeSearchResult | null {
  const filtered = results.filter(
    (r) =>
      r.durationSeconds !== null &&
      r.durationSeconds >= MIN_SECONDS &&
      r.durationSeconds <= MAX_SECONDS
  );
  return filtered[0] ?? null; // keep API relevance order
}
