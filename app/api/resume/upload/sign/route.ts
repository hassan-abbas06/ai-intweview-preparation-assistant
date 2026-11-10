import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary } from "cloudinary";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const WINDOW_MS = 60 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 10;

const ALLOWED_EXTENSIONS = ["pdf", "docx", "jpg", "jpeg", "png", "webp", "heic", "heif"];

// Best-effort in-memory limiter. Shared via globalThis so routes share the same tracking.
const uploadLog: Map<string, number[]> =
  (globalThis as any).__resumeUploadLog ||
  ((globalThis as any).__resumeUploadLog = new Map<string, number[]>());

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

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body.fileName !== "string" || typeof body.fileSize !== "number") {
      return errorResponse("Invalid request body. Expected fileName and fileSize.", 400);
    }

    const { fileName, fileSize } = body;

    if (fileSize <= 0) {
      return errorResponse("The file is empty.", 400);
    }

    if (fileSize > MAX_BYTES) {
      return errorResponse("File exceeds the 10 MB limit.", 413);
    }

    const ext = (fileName.split(".").pop() || "").toLowerCase();
    let isAllowed = false;
    for (let i = 0; i < ALLOWED_EXTENSIONS.length; i++) {
      if (ext === ALLOWED_EXTENSIONS[i]) {
        isAllowed = true;
        break;
      }
    }

    if (!isAllowed) {
      return errorResponse(
        "Accepted formats: PDF, DOCX, JPG, PNG, WEBP, HEIC, HEIF.",
        400
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return errorResponse("Storage service is not configured.", 500);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `resumes/${user.id}`;
    const type = "authenticated";

    const paramsToSign = {
      folder,
      timestamp,
      type,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return successResponse(
      {
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
        type,
      },
      "Upload signature generated."
    );
  } catch (err: any) {
    return errorResponse(err?.message || "Failed to generate upload signature.", 500);
  }
}
