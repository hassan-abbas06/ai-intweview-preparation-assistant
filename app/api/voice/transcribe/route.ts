import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
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

    if (!file) {
      return NextResponse.json(
        { error: "No audio file payload provided." },
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
