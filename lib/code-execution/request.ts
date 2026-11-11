export const MAX_CODE_LENGTH = 20000;

export function validateCodeRequestBody(body: unknown):
  | { ok: true; value: { problemId: string; language: string; code: string } }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Invalid request body." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.problemId !== "string" || !b.problemId.trim()) {
    return { ok: false, message: "Problem ID is required." };
  }

  if (typeof b.language !== "string" || !b.language.trim()) {
    return { ok: false, message: "Language is required." };
  }

  if (typeof b.code !== "string") {
    return { ok: false, message: "Code must be a string." };
  }

  if (!b.code.trim()) {
    return { ok: false, message: "Code cannot be empty." };
  }

  if (b.code.length > MAX_CODE_LENGTH) {
    return { ok: false, message: `Code is too long (max ${MAX_CODE_LENGTH} characters).` };
  }

  return {
    ok: true,
    value: {
      problemId: b.problemId.trim(),
      language: b.language.trim().toLowerCase(),
      code: b.code,
    },
  };
}
