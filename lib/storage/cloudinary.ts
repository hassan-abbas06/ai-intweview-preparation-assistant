import { v2 as cloudinary } from "cloudinary";

// Resumes are stored PRIVATELY (type "authenticated"): there is no public URL.
// Downloads go through an owner-checked route that returns a short-lived signed URL.

function configure() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name || !api_key || !api_secret) {
    // Thrown at call time, not import time, so `next build` never fails on missing env.
    throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

export async function uploadResumeBuffer(
  buffer: Buffer,
  userId: string
): Promise<{ publicId: string }> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", type: "authenticated", folder: `resumes/${userId}` },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
        resolve({ publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/** Short-lived signed download link (default 5 minutes). Not yet tested end to end. */
export function getSignedDownloadUrl(publicId: string, ttlSeconds = 300): string {
  configure();
  return cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
  });
}

export async function deleteResume(publicId: string): Promise<void> {
  configure();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
    type: "authenticated",
    invalidate: true,
  });
}
