export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
}

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly reason?: string
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

const BASE = "https://www.googleapis.com/youtube/v3";
const REQUEST_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache to make repeated searches instant (<1ms)
const videoCache = new Map<string, { data: YouTubeSearchResult[]; expiresAt: number }>();

const CURATED_FALLBACKS: Record<string, YouTubeSearchResult[]> = {
  finance: [
    {
      videoId: "AYyzkfkeE-8",
      title: "What is Financial Modeling? (Full Beginner’s Guide)",
      channelName: "Christian Wattig",
      thumbnailUrl: "https://i.ytimg.com/vi/AYyzkfkeE-8/mqdefault.jpg",
      durationSeconds: 691,
    },
    {
      videoId: "No8o6f0V1aA",
      title: "Financial Modeling Explained in 10 Minutes",
      channelName: "Ishaan Arora",
      thumbnailUrl: "https://i.ytimg.com/vi/No8o6f0V1aA/mqdefault.jpg",
      durationSeconds: 662,
    },
  ],
  frontend: [
    {
      videoId: "35lXWvCuM8o",
      title: "React State Management Tutorial - How to Choose the Right Solution",
      channelName: "Web Dev Simplified",
      thumbnailUrl: "https://i.ytimg.com/vi/35lXWvCuM8o/mqdefault.jpg",
      durationSeconds: 750,
    },
    {
      videoId: "00kx57oZp3c",
      title: "Mastering Core Web Vitals for Frontend Performance",
      channelName: "Frontend Masters",
      thumbnailUrl: "https://i.ytimg.com/vi/00kx57oZp3c/mqdefault.jpg",
      durationSeconds: 980,
    },
  ],
  system: [
    {
      videoId: "F25tVw8j8d4",
      title: "System Design Basics for Beginners",
      channelName: "Gaurav Sen",
      thumbnailUrl: "https://i.ytimg.com/vi/F25tVw8j8d4/mqdefault.jpg",
      durationSeconds: 600,
    },
    {
      videoId: "i53Gi_K3o7I",
      title: "System Design Interview: A Step-By-Step Guide",
      channelName: "ByteByteGo",
      thumbnailUrl: "https://i.ytimg.com/vi/i53Gi_K3o7I/mqdefault.jpg",
      durationSeconds: 720,
    },
  ],
  database: [
    {
      videoId: "HubezKbFL7E",
      title: "Database Indexing Explained",
      channelName: "Hussein Nasser",
      thumbnailUrl: "https://i.ytimg.com/vi/HubezKbFL7E/mqdefault.jpg",
      durationSeconds: 820,
    },
  ],
  management: [
    {
      videoId: "1_bI3pS3WkU",
      title: "How to Answer Behavioral Interview Questions (STAR Method)",
      channelName: "CareerVidz",
      thumbnailUrl: "https://i.ytimg.com/vi/1_bI3pS3WkU/mqdefault.jpg",
      durationSeconds: 580,
    },
  ],
};

function getCuratedFallback(query: string): YouTubeSearchResult[] {
  const q = query.toLowerCase();
  if (
    q.includes("finan") ||
    q.includes("model") ||
    q.includes("dcf") ||
    q.includes("valuat") ||
    q.includes("cash flow") ||
    q.includes("wacc") ||
    q.includes("ebitda")
  ) {
    return CURATED_FALLBACKS.finance;
  }
  if (
    q.includes("front") ||
    q.includes("react") ||
    q.includes("component") ||
    q.includes("dom") ||
    q.includes("css") ||
    q.includes("web vitals")
  ) {
    return CURATED_FALLBACKS.frontend;
  }
  if (
    q.includes("system") ||
    q.includes("architect") ||
    q.includes("distribut") ||
    q.includes("scalab") ||
    q.includes("microservice")
  ) {
    return CURATED_FALLBACKS.system;
  }
  if (
    q.includes("data") ||
    q.includes("sql") ||
    q.includes("index") ||
    q.includes("query") ||
    q.includes("postgres") ||
    q.includes("schema")
  ) {
    return CURATED_FALLBACKS.database;
  }
  if (
    q.includes("leader") ||
    q.includes("manag") ||
    q.includes("behavior") ||
    q.includes("conflict") ||
    q.includes("star")
  ) {
    return CURATED_FALLBACKS.management;
  }
  return CURATED_FALLBACKS.system;
}

function parseIsoDuration(iso: string): number | null {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

async function getJson(endpoint: string, params: Record<string, string>) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeApiError("YOUTUBE_API_KEY is not set");

  const url = `${BASE}/${endpoint}?${new URLSearchParams({ ...params, key }).toString()}`;
  console.log(`[youtube] ${endpoint} call`); // used to verify call counts (test plan #4)

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new YouTubeApiError(`Network failure calling ${endpoint}: ${(err as Error).message}`);
  }

  if (!res.ok) {
    let reason: string | undefined;
    try {
      const body = await res.json();
      reason = body?.error?.errors?.[0]?.reason;
    } catch {
      /* ignore body parse errors */
    }
    throw new YouTubeApiError(`YouTube ${endpoint} failed (${res.status})`, res.status, reason);
  }
  return res.json();
}

function decodeHtmlEntities(input: string): string {
  const safeCodePoint = (n: number): string => {
    try {
      return String.fromCodePoint(n);
    } catch {
      return "";
    }
  };
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // keep &amp; LAST to avoid double-decoding
}

export async function searchVideos(
  query: string,
  maxResults: number = 3
): Promise<YouTubeSearchResult[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = videoCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const search = await getJson("search", {
      q: query,
      type: "video",
      part: "snippet",
      maxResults: String(maxResults),
      safeSearch: "strict",
      relevanceLanguage: "en",
    });

    const items: any[] = Array.isArray(search?.items) ? search.items : [];
    const base = items
      .filter((i) => i?.id?.videoId && i?.snippet)
      .map((i) => ({
        videoId: i.id.videoId as string,
        title: decodeHtmlEntities(String(i.snippet.title ?? "")),
        channelName: decodeHtmlEntities(String(i.snippet.channelTitle ?? "")),
        thumbnailUrl: (i.snippet.thumbnails?.medium?.url ??
          i.snippet.thumbnails?.default?.url ??
          "") as string,
      }));

    if (base.length === 0) {
      const fallback = getCuratedFallback(query);
      videoCache.set(cacheKey, { data: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
      return fallback;
    }

    // One batched videos.list call for real durations
    const details = await getJson("videos", {
      id: base.map((b) => b.videoId).join(","),
      part: "contentDetails",
    });

    const durations = new Map<string, number | null>();
    for (const v of details?.items ?? []) {
      durations.set(v.id, parseIsoDuration(v.contentDetails?.duration ?? ""));
    }

    const finalResults = base.map((b) => ({
      ...b,
      durationSeconds: durations.get(b.videoId) ?? null,
    }));

    videoCache.set(cacheKey, { data: finalResults, expiresAt: Date.now() + CACHE_TTL_MS });
    return finalResults;
  } catch (err) {
    console.warn(`[youtube] Search failed for "${query}", serving curated fallback:`, (err as Error).message);
    const fallback = getCuratedFallback(query);
    videoCache.set(cacheKey, { data: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
    return fallback;
  }
}
