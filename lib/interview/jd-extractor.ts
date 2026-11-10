import { z } from "zod";
import { getLLMProvider, extractLLMErrorMessage } from "@/lib/llm";

export interface ExtractedJD {
  role: string | null;
  seniority: "junior" | "mid" | "senior" | "staff" | "lead" | null;
  skills: string[];
  responsibilities: string[];
  confidence: "ok" | "low";
}

export const ExtractedJDSchema = z.object({
  role: z.string().nullable(),
  seniority: z.enum(["junior", "mid", "senior", "staff", "lead"]).nullable(),
  skills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  confidence: z.enum(["ok", "low"]),
});

const NULL_EQUIVALENTS = new Set(["null", "none", "n/a", "na", "unknown", "undefined"]);

export function normalizeRole(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (NULL_EQUIVALENTS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function normalizeSeniority(val: unknown): "junior" | "mid" | "senior" | "staff" | "lead" | null {
  const normalized = normalizeRole(val);
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (["junior", "mid", "senior", "staff", "lead"].includes(lower)) {
    return lower as "junior" | "mid" | "senior" | "staff" | "lead";
  }
  return null;
}

const RawLLMOutputSchema = z.object({
  role: z.unknown().optional().nullable(),
  seniority: z.unknown().optional().nullable(),
  skills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
});

const EMPTY_EXTRACTED_JD: ExtractedJD = {
  role: null,
  seniority: null,
  skills: [],
  responsibilities: [],
  confidence: "low",
};

function stripCodeFences(text: string): string {
  let trimmed = text.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch && jsonMatch[1]) {
    trimmed = jsonMatch[1].trim();
  }
  return trimmed;
}

function parseJsonCandidate(rawText: string): unknown | null {
  if (!rawText || typeof rawText !== "string") return null;
  const cleaned = stripCodeFences(rawText);

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting between first '{' and last '}'
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx > startIdx) {
      const slice = cleaned.slice(startIdx, endIdx + 1);
      try {
        return JSON.parse(slice);
      } catch {
        // Simple repair: remove trailing commas before closing braces/brackets
        try {
          const repaired = slice.replace(/,\s*([}\]])/g, "$1");
          return JSON.parse(repaired);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

function normalizeWhitespace(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAlphanumeric(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSkillInText(skill: string, rawText: string): boolean {
  const trimmed = skill.trim();
  if (!trimmed) return false;

  const lowerRaw = rawText.toLowerCase();
  const lowerSkill = trimmed.toLowerCase();

  // 1. Exact case-insensitive substring
  if (lowerRaw.includes(lowerSkill)) {
    return true;
  }

  // 2. Continuous alphanumeric match (handles "Node.js" vs "Nodejs", "CI/CD" vs "CICD")
  const alphaSkill = cleanAlphanumeric(trimmed);
  const alphaRaw = cleanAlphanumeric(rawText);
  if (alphaSkill.length >= 2 && alphaRaw.includes(alphaSkill)) {
    return true;
  }

  // 3. Normalized whitespace substring match
  const normRaw = normalizeWhitespace(rawText);
  const normSkill = normalizeWhitespace(trimmed);
  if (normSkill && normRaw.includes(normSkill)) {
    return true;
  }

  // 4. Simple stemming / plural variation (e.g. "microservices" -> "microservice")
  if (normSkill.endsWith("s") && normSkill.length > 3) {
    const singular = normSkill.slice(0, -1);
    if (normRaw.includes(singular)) {
      return true;
    }
  }

  // 5. Multi-word token coverage: if every token with length > 2 appears in the text
  const tokens = normSkill.split(" ").filter((t) => t.length > 2);
  if (tokens.length > 1 && tokens.every((token) => normRaw.includes(token))) {
    return true;
  }

  return false;
}

function buildPrompt(rawText: string, isRetry: boolean = false): string {
  const base = `You are extracting structured information from a job description for an interview-prep tool.
Read the text below and return ONLY a JSON object with this exact shape:
{
  "role": string or null,
  "seniority": one of "junior","mid","senior","staff","lead", or null if unclear,
  "skills": string[] (only skills/technologies actually mentioned in the text - do not infer
    or add anything not present),
  "responsibilities": string[] (3-6 items, paraphrased briefly)
}
If the text does not look like a real job description, return:
{ "role": null, "seniority": null, "skills": [], "responsibilities": [] }

JOB DESCRIPTION TEXT:
"""
${rawText}
"""`;

  if (isRetry) {
    return `${base}\n\nIMPORTANT: Your previous output was not valid JSON. Return valid JSON only, starting with '{' and ending with '}'. Do not include markdown code fences, comments, or extra text.`;
  }
  return base;
}

export async function extractJobDescription(rawText: string): Promise<ExtractedJD> {
  // Empty / whitespace-only rawText: return low-confidence empty result without calling LLM
  if (!rawText || !rawText.trim()) {
    return { ...EMPTY_EXTRACTED_JD };
  }

  const llm = getLLMProvider();

  let rawResponse: string | null = null;
  let parsedJson: unknown | null = null;

  try {
    // 1. Primary LLM extraction call (generous maxOutputTokens so JSON is never truncated)
    rawResponse = await llm.generateText({
      messages: [{ role: "user", content: buildPrompt(rawText, false) }],
      temperature: 0.1,
      maxOutputTokens: 1024,
    });

    parsedJson = parseJsonCandidate(rawResponse);

    // 2. Retry ONCE if JSON parsing fails
    if (!parsedJson) {
      console.warn("[JD Extractor] Initial response invalid JSON, retrying once with explicit JSON reminder...");
      const retryResponse = await llm.generateText({
        messages: [{ role: "user", content: buildPrompt(rawText, true) }],
        temperature: 0.1,
        maxOutputTokens: 1024,
      });
      parsedJson = parseJsonCandidate(retryResponse);
    }
  } catch (providerErr: any) {
    // If both providers fail entirely: log error server-side and return low-confidence empty result
    const msg = extractLLMErrorMessage(providerErr);
    console.error(`[JD Extractor] LLM provider error during JD extraction: ${msg}`);
    return { ...EMPTY_EXTRACTED_JD };
  }

  // If still invalid JSON after retry, return low-confidence empty result
  if (!parsedJson) {
    console.warn("[JD Extractor] JSON parsing failed after retry. Returning low-confidence fallback.");
    return { ...EMPTY_EXTRACTED_JD };
  }

  // Validate parsed JSON through Zod schema
  const validation = RawLLMOutputSchema.safeParse(parsedJson);
  if (!validation.success) {
    console.warn("[JD Extractor] Zod schema validation failed for extracted payload:", validation.error.message);
    return { ...EMPTY_EXTRACTED_JD };
  }

  const { skills: rawSkills, responsibilities } = validation.data;
  const role = normalizeRole(validation.data.role);
  const seniority = normalizeSeniority(validation.data.seniority);

  // Sanity check after parsing:
  // Keep a skill only if it appears as a case-insensitive substring of rawText, or is a very close fuzzy match.
  const keptSkills: string[] = [];
  let droppedCount = 0;

  for (const s of rawSkills) {
    const trimmedSkill = s.trim();
    if (!trimmedSkill) {
      droppedCount++;
      continue;
    }

    if (isSkillInText(trimmedSkill, rawText)) {
      keptSkills.push(trimmedSkill);
    } else {
      droppedCount++;
      console.log(`[JD Extractor Sanity] Dropped hallucinated skill not found in rawText: "${trimmedSkill}"`);
    }
  }

  // Confidence computation:
  // confidence = "low" if more than half of the returned skills were dropped, OR skills is empty, OR role is null.
  // Otherwise "ok".
  const totalReturnedSkills = rawSkills.length;
  const moreThanHalfDropped = totalReturnedSkills > 0 && droppedCount > totalReturnedSkills / 2;
  const skillsEmpty = keptSkills.length === 0;
  const roleNull = role === null;

  const confidence: "ok" | "low" =
    moreThanHalfDropped || skillsEmpty || roleNull ? "low" : "ok";

  const result: ExtractedJD = {
    role,
    seniority,
    skills: keptSkills,
    responsibilities,
    confidence,
  };

  // Ensure result satisfies ExtractedJDSchema
  return ExtractedJDSchema.parse(result);
}
