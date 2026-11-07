import JSZip from "jszip";
import mammoth from "mammoth";
import { ocrWithGemini } from "./ocr";

export type ResumeFileType = "pdf" | "docx" | "image";

export interface ResumeSections {
  contact: string | null;
  summary: string | null;
  experience: string | null;
  education: string | null;
  skills: string | null;
  projects: string | null;
}

/** null = "not checked" (could not be measured reliably). Never guessed. */
export interface ResumeStructure {
  fileType: ResumeFileType;
  ocrUsed: boolean; // true when text came from OCR (image or scanned PDF)
  pageCount: number | null;
  tableCount: number | null;
  imageCount: number | null;
  columnCount: number | null;
  hasHeaderFooterContent: boolean | null;
  distinctFontCount: number | null;
}

export interface ParsedResume {
  fileType: ResumeFileType;
  text: string;
  wordCount: number;
  sections: ResumeSections;
  structure: ResumeStructure;
  warnings: string[];
}

/** No usable text, even after OCR. */
export class UnreadableResumeError extends Error {}
/** Corrupted or unsupported file. */
export class ResumeParseError extends Error {}
/** Document does not have enough resume signals. */
export class NotAResumeError extends Error {
  constructor(message = "This doesn't look like a resume.") {
    super(message);
    this.name = "NotAResumeError";
  }
}

const MIN_WORDS = 40;
const MAX_TEXT_CHARS = 60000;

interface Detected {
  fileType: ResumeFileType;
  mime: string;
}

function detectFileType(buf: Buffer): Detected {
  // Magic bytes, not the filename or MIME type the client claims.
  const head4 = buf.subarray(0, 4).toString("latin1");
  if (head4 === "%PDF") return { fileType: "pdf", mime: "application/pdf" };
  if (buf[0] === 0x89 && head4.slice(1) === "PNG") return { fileType: "image", mime: "image/png" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { fileType: "image", mime: "image/jpeg" };
  if (head4 === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") {
    return { fileType: "image", mime: "image/webp" };
  }
  if (buf.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("latin1");
    if (/^(heic|heix|hevc|hevx|heim|heis)$/.test(brand)) return { fileType: "image", mime: "image/heic" };
    if (/^(mif1|msf1)$/.test(brand)) return { fileType: "image", mime: "image/heif" };
  }
  if (buf[0] === 0x50 && buf[1] === 0x4b) return { fileType: "docx", mime: "application/zip" }; // "PK"
  throw new ResumeParseError("Unsupported or corrupted file.");
}

const HEADINGS: Record<Exclude<keyof ResumeSections, "contact">, RegExp> = {
  summary: /^(professional\s+|career\s+)?(summary|profile|objective|about(\s+me)?)$/i,
  experience:
    /^(work\s+|professional\s+|relevant\s+)?(experience|employment(\s+history)?|work\s+history|internships?)$/i,
  education: /^(education|academics?|academic\s+(background|qualifications)|qualifications)$/i,
  skills:
    /^(technical\s+|key\s+|core\s+)?(skills|competencies|technologies|skills\s*(&|and)\s*tools)$/i,
  projects: /^(academic\s+|personal\s+|key\s+)?projects?$/i,
};

function headingKey(line: string): keyof typeof HEADINGS | null {
  const cleaned = line.trim().replace(/[:\-–—|]+$/g, "").trim();
  if (!cleaned || cleaned.length > 40) return null;
  const keys = Object.keys(HEADINGS) as (keyof typeof HEADINGS)[];
  for (let i = 0; i < keys.length; i++) {
    if (HEADINGS[keys[i]].test(cleaned)) return keys[i];
  }
  return null;
}

export function splitSections(text: string): ResumeSections {
  const sections: ResumeSections = {
    contact: null,
    summary: null,
    experience: null,
    education: null,
    skills: null,
    projects: null,
  };
  const lines = text.split(/\r?\n/);
  let current: keyof typeof HEADINGS | "contact" = "contact";
  const buckets: Record<string, string[]> = { contact: [] };

  for (const line of lines) {
    const key = headingKey(line);
    if (key) {
      current = key;
      buckets[current] = buckets[current] ?? [];
      continue;
    }
    if (line.trim()) {
      buckets[current] = buckets[current] ?? [];
      buckets[current].push(line.trim());
    }
  }
  // Contact = top block before the first heading, capped so a resume with no
  // detectable headings doesn't dump everything into "contact".
  const contact = (buckets.contact ?? []).slice(0, 8).join("\n");
  sections.contact = contact || null;
  const keys = Object.keys(HEADINGS) as (keyof typeof HEADINGS)[];
  for (let i = 0; i < keys.length; i++) {
    const body = (buckets[keys[i]] ?? []).join("\n");
    sections[keys[i]] = body || null;
  }
  return sections;
}

export const SECONDARY_HEADINGS: readonly string[] = [
  "certifications",
  "certificates",
  "achievements",
  "awards",
  "languages",
  "interests",
  "hobbies",
  "references",
  "volunteer experience",
  "publications",
  "courses",
  "training",
  "extracurricular activities",
  "leadership",
];

const SECONDARY_HEADINGS_SET = new Set(SECONDARY_HEADINGS);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,13}/;

export function looksLikeResume(text: string, sections: ResumeSections): boolean {
  if (!text || !sections) return false;

  let coreCount = 0;
  if (sections.summary !== null && sections.summary !== undefined) coreCount++;
  if (sections.experience !== null && sections.experience !== undefined) coreCount++;
  if (sections.education !== null && sections.education !== undefined) coreCount++;
  if (sections.skills !== null && sections.skills !== undefined) coreCount++;
  if (sections.projects !== null && sections.projects !== undefined) coreCount++;

  let secondaryCount = 0;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.length > 30) continue;
    const cleaned = rawLine.replace(/\s*:+\s*$/, "").trim().toLowerCase();
    if (SECONDARY_HEADINGS_SET.has(cleaned)) {
      secondaryCount++;
    }
  }

  const hasEmail = EMAIL_REGEX.test(text);
  const hasPhone = PHONE_REGEX.test(text);

  if (coreCount >= 2) return true;
  if (coreCount >= 1 && (secondaryCount >= 1 || (hasEmail && hasPhone))) return true;

  return false;
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

async function parsePdf(buf: Buffer) {
  try {
    // Deep import avoids pdf-parse v1's debug-mode side effect on the package root.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdfParse(buf);
    return { text: result.text ?? "", pageCount: result.numpages ?? null };
  } catch {
    throw new ResumeParseError("Could not read this PDF.");
  }
}

async function parseDocx(buf: Buffer) {
  let text = "";
  try {
    text = (await mammoth.extractRawText({ buffer: buf })).value ?? "";
  } catch {
    throw new ResumeParseError("Could not read this DOCX.");
  }

  const zip = await JSZip.loadAsync(buf).catch(() => {
    throw new ResumeParseError("Could not read this DOCX.");
  });
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new ResumeParseError("Not a valid DOCX.");
  const xml = await docFile.async("string");

  const tableCount = (xml.match(/<w:tbl>/g) ?? []).length;
  const imageCount =
    (xml.match(/<w:drawing[\s>]/g) ?? []).length + (xml.match(/<w:pict[\s>]/g) ?? []).length;
  const colNums = Array.from(xml.matchAll(/<w:cols\b[^>]*\bw:num="(\d+)"/g)).map((m) => parseInt(m[1], 10));
  const columnCount = colNums.length ? Math.max(...colNums) : 1;
  const fonts = new Set(Array.from(xml.matchAll(/<w:rFonts\b[^>]*\bw:ascii="([^"]+)"/g)).map((m) => m[1]));

  let hasHeaderFooterContent = false;
  const names = Object.keys(zip.files);
  for (let i = 0; i < names.length; i++) {
    if (/^word\/(header|footer)\d*\.xml$/.test(names[i])) {
      const part = await zip.files[names[i]].async("string");
      if (part.replace(/<[^>]+>/g, "").trim()) {
        hasHeaderFooterContent = true;
        break;
      }
    }
  }

  return {
    text,
    structure: {
      fileType: "docx" as const,
      ocrUsed: false,
      pageCount: null, // DOCX page count is not reliably knowable without rendering
      tableCount,
      imageCount,
      columnCount,
      hasHeaderFooterContent,
      // Document-level fonts only; fonts inherited from styles.xml are not counted.
      distinctFontCount: fonts.size,
    },
  };
}

/** Structure we cannot measure from a PDF text layer or an image: all "not checked". */
function unmeasuredStructure(
  fileType: ResumeFileType,
  ocrUsed: boolean,
  pageCount: number | null
): ResumeStructure {
  return {
    fileType,
    ocrUsed,
    pageCount,
    tableCount: null,
    imageCount: null,
    columnCount: null,
    hasHeaderFooterContent: null,
    distinctFontCount: null,
  };
}

async function runOcr(buf: Buffer, mime: string): Promise<string> {
  // OcrUnavailableError propagates so the route can answer 503.
  const text = await ocrWithGemini(buf, mime);
  if (!text || /^UNREADABLE$/i.test(text.trim())) {
    throw new UnreadableResumeError("OCR found no readable text.");
  }
  return text;
}

export async function parseResume(buf: Buffer): Promise<ParsedResume> {
  const { fileType, mime } = detectFileType(buf);
  const warnings: string[] = [];

  let rawText: string;
  let structure: ResumeStructure;

  if (fileType === "docx") {
    const parsed = await parseDocx(buf);
    rawText = parsed.text;
    structure = parsed.structure;
  } else if (fileType === "pdf") {
    const { text, pageCount } = await parsePdf(buf);
    let ocrUsed = false;
    rawText = text;
    if (countWords(text) < MIN_WORDS) {
      // No text layer: scanned PDF. Fall back to OCR.
      rawText = await runOcr(buf, mime);
      ocrUsed = true;
      warnings.push("This PDF had no text layer, so the text was read with OCR and may contain errors.");
    }
    structure = unmeasuredStructure("pdf", ocrUsed, pageCount);
  } else {
    rawText = await runOcr(buf, mime);
    structure = unmeasuredStructure("image", true, 1);
    warnings.push("Text was read from an image with OCR and may contain errors.");
    warnings.push("Most ATS systems cannot read image resumes. Apply with a text-based PDF or DOCX.");
  }

  const text = rawText.replace(/\u0000/g, "").trim().slice(0, MAX_TEXT_CHARS);
  const wordCount = countWords(text);
  if (wordCount < MIN_WORDS) {
    throw new UnreadableResumeError("No usable text found.");
  }

  const sections = splitSections(text);
  if (!looksLikeResume(text, sections)) {
    throw new NotAResumeError("This doesn't look like a resume.");
  }
  const found = Object.values(sections).filter(Boolean).length;
  if (found <= 1) {
    warnings.push("Very few standard section headings were detected.");
  }

  return { fileType, text, wordCount, sections, structure, warnings };
}
