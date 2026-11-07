import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import Groq from "groq-sdk";

// Best-effort in-memory rate limiter: max 20 requests per 10 minutes per user.
// NOTE: This is per-instance (in-memory) and should be replaced with a shared store (e.g. Upstash Redis) if traffic grows.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 20;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(userId) || []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(userId, timestamps);
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticated candidate session check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in first." },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email!;

    // 2. Best-effort per-user rate limit check
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 20 transcription requests per 10 minutes." },
        { status: 429 }
      );
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (!groqKey) {
      return NextResponse.json(
        { error: "Groq API key not configured for Whisper speech transcription." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "en-IN";

    // 3. Reject missing file with 400
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No audio file payload provided." },
        { status: 400 }
      );
    }

    // 4. Reject uploads larger than 5 MB with 413
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Audio file exceeds 5 MB limit." },
        { status: 413 }
      );
    }

    // 5. Reject non-audio files with 400
    const isAudio =
      Boolean(file.type && file.type.startsWith("audio/")) ||
      /\.(webm|mp3|wav|m4a|mp4|ogg|aac|flac)$/i.test(file.name);

    if (!isAudio) {
      return NextResponse.json(
        { error: "Invalid file type. Only audio files are accepted." },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey: groqKey });

    // Whisper supports language code or automatic prompt biasing for interview contexts
    const langCode = language.startsWith("en") ? "en" : language;

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: langCode,
      prompt:
        "Technical interview for engineering student, computer science, electronics and communication, third year, pursuing B.Tech, coding, aptitude, hello, hey.",
      temperature: 0.0,
      response_format: "json",
    });

    return NextResponse.json({
      success: true,
      transcript: transcription.text?.trim() || "",
    });
  } catch (err: any) {
    console.error("[Voice:Whisper Transcribe Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to transcribe audio stream." },
      { status: 500 }
    );
  }
}
