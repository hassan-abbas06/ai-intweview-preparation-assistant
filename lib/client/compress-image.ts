/**
 * Client-side image compression utility for photo uploads.
 * If an image exceeds maxBytes, decodes it, caps the longest side at 2400px,
 * and re-encodes as JPEG down to 3.5MB.
 */

const TARGET_MAX_BYTES = 3.5 * 1024 * 1024; // 3.5 MB
const INITIAL_MAX_LONGEST_SIDE = 2400; // px
const MIN_LONGEST_SIDE = 1200; // px
const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.5];

const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
];

function isImageFile(file: File): boolean {
  if (!file) return false;

  const name = file.name || "";
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot !== -1 ? name.slice(lastDot + 1).toLowerCase() : "";
  for (let i = 0; i < SUPPORTED_IMAGE_EXTENSIONS.length; i++) {
    if (ext === SUPPORTED_IMAGE_EXTENSIONS[i]) {
      return true;
    }
  }

  const type = (file.type || "").toLowerCase();
  for (let i = 0; i < SUPPORTED_IMAGE_TYPES.length; i++) {
    if (type === SUPPORTED_IMAGE_TYPES[i]) {
      return true;
    }
  }

  return false;
}

function getJpegFileName(originalName: string): string {
  const lastDot = originalName.lastIndexOf(".");
  if (lastDot > 0) {
    return originalName.slice(0, lastDot) + ".jpg";
  }
  return originalName ? originalName + ".jpg" : "resume.jpg";
}

interface DecodedImage {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, targetWidth: number, targetHeight: number) => void;
  cleanup: () => void;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  const DECODE_ERROR_MSG =
    "This photo format can't be read in your browser. Please convert it to JPG or PNG and try again.";

  // 1. Try createImageBitmap if available in current browser environment
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
        return {
          width: bitmap.width,
          height: bitmap.height,
          draw: (ctx, targetWidth, targetHeight) => {
            ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
          },
          cleanup: () => {
            if (typeof bitmap.close === "function") {
              bitmap.close();
            }
          },
        };
      }
    } catch {
      // Fall through to HTMLImageElement fallback
    }
  }

  // 2. Fallback to HTMLImageElement
  if (typeof window !== "undefined" && typeof Image !== "undefined" && typeof URL !== "undefined") {
    return new Promise<DecodedImage>((resolve, reject) => {
      let objectUrl = "";
      try {
        objectUrl = URL.createObjectURL(file);
      } catch {
        reject(new Error(DECODE_ERROR_MSG));
        return;
      }

      const img = new Image();

      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w > 0 && h > 0) {
          resolve({
            width: w,
            height: h,
            draw: (ctx, targetWidth, targetHeight) => {
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            },
            cleanup: () => {
              try {
                URL.revokeObjectURL(objectUrl);
              } catch {
                // Ignore
              }
            },
          });
        } else {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // Ignore
          }
          reject(new Error(DECODE_ERROR_MSG));
        }
      };

      img.onerror = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Ignore
        }
        reject(new Error(DECODE_ERROR_MSG));
      };

      img.src = objectUrl;
    });
  }

  throw new Error(DECODE_ERROR_MSG);
}

/**
 * Compresses an image file if it exceeds maxBytes.
 * Non-image files and files already at or under maxBytes are returned unchanged.
 */
export async function compressImageIfNeeded(file: File, maxBytes: number): Promise<File> {
  // If not an image or already at/under maxBytes, return unchanged (never throw)
  if (!isImageFile(file) || file.size <= maxBytes) {
    return file;
  }

  // If running in an environment without DOM canvas support, return original
  if (typeof document === "undefined") {
    return file;
  }

  const decoded = await decodeImage(file);

  try {
    const originalLongest = Math.max(decoded.width, decoded.height);
    let currentLongestCap = Math.min(originalLongest, INITIAL_MAX_LONGEST_SIDE);
    const minLongest = Math.min(originalLongest, MIN_LONGEST_SIDE);

    let chosenBlob: Blob | null = null;
    let absoluteSmallestBlob: Blob | null = null;

    while (!chosenBlob) {
      const scale = originalLongest > 0 ? currentLongestCap / originalLongest : 1;
      const targetWidth = Math.max(1, Math.round(decoded.width * scale));
      const targetHeight = Math.max(1, Math.round(decoded.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas rendering context.");
      }

      // Draw solid white background to handle PNG/WEBP transparency
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      decoded.draw(ctx, targetWidth, targetHeight);

      let smallestBlobForThisDim: Blob | null = null;

      for (let i = 0; i < QUALITIES.length; i++) {
        const quality = QUALITIES[i];
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
        });

        if (blob) {
          if (!smallestBlobForThisDim || blob.size < smallestBlobForThisDim.size) {
            smallestBlobForThisDim = blob;
          }
          if (!absoluteSmallestBlob || blob.size < absoluteSmallestBlob.size) {
            absoluteSmallestBlob = blob;
          }
          if (blob.size <= TARGET_MAX_BYTES) {
            chosenBlob = blob;
            break;
          }
        }
      }

      if (chosenBlob) {
        break;
      }

      // If still too big, shrink longest side by 20% down to 1200 px
      if (currentLongestCap <= minLongest) {
        chosenBlob = smallestBlobForThisDim || absoluteSmallestBlob;
        break;
      }

      const nextCap = Math.round(currentLongestCap * 0.8);
      if (nextCap < minLongest) {
        currentLongestCap = minLongest;
      } else {
        currentLongestCap = nextCap;
      }
    }

    if (!chosenBlob) {
      return file;
    }

    const newName = getJpegFileName(file.name || "resume.jpg");
    return new File([chosenBlob], newName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    decoded.cleanup();
  }
}
