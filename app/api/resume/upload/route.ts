import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/api-response";
import { parseResume, UnreadableResumeError, ResumeParseError } from "@/lib/resume/parse";
import { OcrUnavailableError } from "@/lib/resume/ocr";
import { uploadResumeBuffer, deleteResume } from "@/lib/storage/cloudinary";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // OCR on images and scanned PDFs can take several seconds

const MAX_BYTES = 4 * 1024 * 1024; // hosts like Vercel reject bodies over ~4.5 MB anyway
const WINDOW_MS = 60 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 10;

// Best-effort in-memory limiter. Per-instance only: replace with a shared store if traffic grows.
const uploadLog = new Map<string, number[]>();
function allowUpload(userId: string): boolean {
  const now = Date.now();
  const recent = (uploadLog.get(userId) ?? []).filter((t) => t > now - WINDOW_MS);
  if (recent.length >= MAX_UPLOADS_PER_WINDOW) {
    uploadLog.set(userId, recent);
    return false;
  }
  recent.push(now);
  uploadLog.set(userId, recent);
  return true;
}

function safeFileName(name: string): string {
  return name.replace(/^.*[\\/]/, "").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "resume";
}

export async function POST(req: NextRequest) {
  let publicId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized. Please sign in first.", 401);
    }

    let user = session.user.id
      ? await prisma.user.findUnique({ where: { id: session.user.id } })
      : null;
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.trim().toLowerCase() },
      });
    }
    if (!user) return errorResponse("Candidate account not found.", 404);

    if (!allowUpload(user.id)) {
      return rateLimitResponse("Upload limit reached (10 per hour). Please try again later.");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return errorResponse("No file provided.", 400);
    }
    if (file.size === 0) return errorResponse("The file is empty.", 400);
    if (file.size > MAX_BYTES) return errorResponse("File exceeds the 4 MB limit.", 413);
    if (!/\.(pdf|docx|jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      return errorResponse(
        "Accepted formats: PDF, DOCX, JPG, PNG, WEBP, HEIC.",
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse BEFORE uploading: unreadable files never reach storage.
    let parsed;
    try {
      parsed = await parseResume(buffer);
    } catch (err) {
      if (err instanceof OcrUnavailableError) {
        return errorResponse(
          "Reading images and scanned files is temporarily unavailable. Try a text-based PDF or DOCX.",
          503,
          err
        );
      }
      if (err instanceof UnreadableResumeError) {
        return errorResponse(
          "We couldn't read any text from this file. Try a clearer image or a different export.",
          422
        );
      }
      if (err instanceof ResumeParseError) {
        return errorResponse("We couldn't read this file. Try exporting it again.", 422);
      }
      throw err;
    }

    const uploaded = await uploadResumeBuffer(buffer, user.id);
    publicId = uploaded.publicId;

    // fileUrl holds the Cloudinary publicId (the file is private, so it has no public URL).
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        fileUrl: publicId,
        fileName: safeFileName(file.name),
        fileSize: file.size,
        parsedData: {
          fileType: parsed.fileType,
          text: parsed.text,
          wordCount: parsed.wordCount,
          sections: parsed.sections,
          structure: parsed.structure,
          warnings: parsed.warnings,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    publicId = null; // stored successfully, nothing to clean up

    return successResponse(
      {
        resumeId: resume.id,
        fileName: resume.fileName,
        fileType: parsed.fileType,
        wordCount: parsed.wordCount,
        sectionsFound: Object.entries(parsed.sections)
          .filter(([, v]) => v)
          .map(([k]) => k),
        structure: parsed.structure,
        warnings: parsed.warnings,
      },
      "Resume uploaded."
    );
  } catch (err) {
    // If the file reached Cloudinary but the database insert failed, don't leave it orphaned.
    if (publicId) await deleteResume(publicId).catch(() => {});
    return errorResponse("Failed to upload resume.", 500, err);
  }
}
