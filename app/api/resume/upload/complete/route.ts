import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  parseResume,
  UnreadableResumeError,
  ResumeParseError,
  NotAResumeError,
} from "@/lib/resume/parse";
import { OcrUnavailableError } from "@/lib/resume/ocr";
import { getSignedDownloadUrl, deleteResume } from "@/lib/storage/cloudinary";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // OCR on images and scanned PDFs can take several seconds

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const CompleteBodySchema = z.object({
  publicId: z.string().min(1, "publicId is required"),
  fileName: z.string().min(1, "fileName is required"),
});

function safeFileName(name: string): string {
  return name.replace(/^.*[\\/]/, "").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "resume";
}

function detectBufferType(buf: Buffer): string {
  const head4 = buf.subarray(0, 4).toString("latin1");
  if (head4 === "%PDF") return "pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b) return "docx";
  return "image";
}

interface DownloadSuccess {
  buffer: Buffer;
}

interface DownloadFailure {
  errorStatus: number;
  errorMessage: string;
}

type DownloadResult = DownloadSuccess | DownloadFailure;

async function downloadFromCloudinaryWithRetry(publicId: string): Promise<DownloadResult> {
  const MAX_ATTEMPTS = 3;
  const ATTEMPT_TIMEOUT_MS = 15000;
  const RETRY_DELAYS = [500, 1500];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptStart = Date.now();
    const downloadUrl = getSignedDownloadUrl(publicId, 300);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, ATTEMPT_TIMEOUT_MS);

    try {
      const res = await fetch(downloadUrl, { signal: controller.signal });

      if (res.ok) {
        const contentLength = res.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
          clearTimeout(timer);
          const elapsed = Date.now() - attemptStart;
          console.log(`[resume-complete] download attempt ${attempt}: ${elapsed}ms size exceeded`);
          return { errorStatus: 413, errorMessage: "File exceeds the 10 MB limit." };
        }

        const arrayBuffer = await res.arrayBuffer();
        clearTimeout(timer);
        const elapsed = Date.now() - attemptStart;

        if (arrayBuffer.byteLength > MAX_BYTES) {
          console.log(`[resume-complete] download attempt ${attempt}: ${elapsed}ms size exceeded`);
          return { errorStatus: 413, errorMessage: "File exceeds the 10 MB limit." };
        }

        if (arrayBuffer.byteLength === 0) {
          console.log(`[resume-complete] download attempt ${attempt}: ${elapsed}ms empty`);
          return { errorStatus: 400, errorMessage: "The file is empty." };
        }

        console.log(`[resume-complete] download attempt ${attempt}: ${elapsed}ms ok`);
        return { buffer: Buffer.from(arrayBuffer) };
      }

      clearTimeout(timer);
      const elapsed = Date.now() - attemptStart;
      console.log(`[resume-complete] download attempt ${attempt}: ${elapsed}ms HTTP ${res.status}`);

      // Do not retry on 4xx (client errors)
      if (res.status >= 400 && res.status < 500) {
        return {
          errorStatus: 503,
          errorMessage: "We couldn't fetch your file from storage. Please try uploading again.",
        };
      }

      // Retry on 5xx if attempts remain
      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS[attempt - 1] || 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err: any) {
      clearTimeout(timer);
      const elapsed = Date.now() - attemptStart;
      const outcome = err?.name === "AbortError" ? "timeout" : "network error";
      console.log(`[resume-complete] download attempt ${attempt}: ${elapsed}ms ${outcome}`);

      // Retry on timeout or network error if attempts remain
      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS[attempt - 1] || 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    errorStatus: 503,
    errorMessage: "We couldn't fetch your file from storage. Please try uploading again.",
  };
}

export async function POST(req: NextRequest) {
  const totalStart = Date.now();
  let targetPublicId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized. Please sign in first.", 401);
    }

    const userStart = Date.now();
    let user = session.user.id
      ? await prisma.user.findUnique({ where: { id: session.user.id } })
      : null;
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.trim().toLowerCase() },
      });
    }
    const userMs = Date.now() - userStart;
    console.log(`[resume-complete] user lookup: ${userMs}ms`);

    if (!user) return errorResponse("Candidate account not found.", 404);

    const body = await req.json().catch(() => null);
    const parseResult = CompleteBodySchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse("Invalid request body. Expected publicId and fileName.", 400);
    }

    const { publicId, fileName } = parseResult.data;
    targetPublicId = publicId;

    // The publicId MUST start with "resumes/<userId>/" or return 403.
    const expectedPrefix = `resumes/${user.id}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      return errorResponse("Forbidden. Invalid public ID for this account.", 403);
    }

    // Download the file server-side from Cloudinary with timeout and retry
    const downloadStart = Date.now();
    const downloadResult = await downloadFromCloudinaryWithRetry(publicId);

    if ("errorStatus" in downloadResult) {
      await deleteResume(publicId).catch(() => {});
      return errorResponse(downloadResult.errorMessage, downloadResult.errorStatus);
    }

    const buffer = downloadResult.buffer;
    const downloadMs = Date.now() - downloadStart;
    const detectedType = detectBufferType(buffer);
    console.log(`[resume-complete] signed download from Cloudinary: ${downloadMs}ms`);

    // Run existing parseResume on bytes and map errors exactly
    // If parsing involves OCR (images or scanned PDFs), cap the call at 45 seconds in total.
    const parseStart = Date.now();
    let parsed;
    try {
      if (detectedType !== "docx") {
        let timeoutId: NodeJS.Timeout | null = null;
        const ocrTimeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new OcrUnavailableError("OCR processing exceeded 45 seconds."));
          }, 45000);
        });

        try {
          parsed = await Promise.race([parseResume(buffer), ocrTimeout]);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      } else {
        parsed = await parseResume(buffer);
      }
    } catch (err) {
      const parseMs = Date.now() - parseStart;
      console.log(`[resume-complete] parseResume: ${parseMs}ms`);
      await deleteResume(publicId).catch(() => {});
      if (err instanceof NotAResumeError) {
        return errorResponse(
          "This doesn't look like a resume. Upload your resume: it should have sections such as Education, Experience, Skills or Projects.",
          422
        );
      }
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
      return errorResponse("We couldn't read this file. Try exporting it again.", 422);
    }

    const parseMs = Date.now() - parseStart;
    console.log(`[resume-complete] parseResume: ${parseMs}ms`);

    // Create the Resume row exactly like the current upload route
    const dbStart = Date.now();
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        fileUrl: publicId,
        fileName: safeFileName(fileName),
        fileSize: buffer.byteLength,
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
    const dbMs = Date.now() - dbStart;
    console.log(`[resume-complete] Resume row insert: ${dbMs}ms`);

    const totalMs = Date.now() - totalStart;
    console.log(`[resume-complete] total: ${totalMs}ms`);

    targetPublicId = null; // Stored successfully, do not delete

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
  } catch (err: any) {
    const totalMs = Date.now() - totalStart;
    console.log(`[resume-complete] total: ${totalMs}ms`);
    if (targetPublicId) {
      await deleteResume(targetPublicId).catch(() => {});
    }
    return errorResponse(err?.message || "Failed to complete resume upload.", 500);
  }
}
