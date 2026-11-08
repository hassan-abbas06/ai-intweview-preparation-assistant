import { ParsedResume } from "./parse";
import {
  extractJdKeywords,
  matchKeywords,
  termMatches,
  KeywordMatchResult,
  MIN_JD_KEYWORDS_TO_SCORE,
  THRESHOLD_LOW_TRUST_KEYWORDS,
} from "./keywords";
import {
  SKILL_TERMS,
  STOPWORDS,
  STRONG_ACTION_VERBS,
  MODERATE_ACTION_VERBS,
  WEAK_ACTION_VERBS,
} from "./skill-terms";

export { MIN_JD_KEYWORDS_TO_SCORE, THRESHOLD_LOW_TRUST_KEYWORDS };

// Constant score caps
export const SCORE_CAP_KEYWORD_STUFFING = 70;
export const SCORE_CAP_IMAGE_RESUME = 50;

// Format check weights (Sum = 42)
export const WEIGHT_FILE_READABILITY = 10;
export const WEIGHT_TABLES = 10;
export const WEIGHT_IMAGES = 6;
export const WEIGHT_COLUMNS = 8;
export const WEIGHT_HEADER_FOOTER = 5;
export const WEIGHT_FONTS = 3;

// Content check weights (General mode sum = 100, Job-Targeted sum = 130)
export const WEIGHT_CONTACT_INFO = 6;
export const WEIGHT_SECTIONS = 10;
export const WEIGHT_LENGTH = 6;
export const WEIGHT_QUANTIFIED_IMPACT = 10;
export const WEIGHT_WEAK_PHRASING = 6;
export const WEIGHT_KEYWORD_DENSITY = 6;
export const WEIGHT_EXPERIENCE_DEPTH = 14;
export const WEIGHT_SKILLS_BREADTH = 10;
export const WEIGHT_ACTION_VERB_STRENGTH = 12;
export const WEIGHT_BULLET_READABILITY = 6;
export const WEIGHT_PROFILE_LINKS = 4;
export const WEIGHT_SUMMARY_QUALITY = 10;
export const WEIGHT_JD_MATCH = 30; // JOB_TARGETED mode only

// Constant thresholds
export const THRESHOLD_LENGTH_MIN_PASS = 150;
export const THRESHOLD_LENGTH_MAX_PASS = 900;
export const THRESHOLD_LENGTH_MIN_FAIL = 80;
export const THRESHOLD_LENGTH_MAX_FAIL = 1500;

export const THRESHOLD_QUANTIFIED_PASS = 0.25; // 25%
export const THRESHOLD_QUANTIFIED_WARN = 0.10; // 10%

export const THRESHOLD_WEAK_PHRASING_PASS = 0.15; // <15%
export const THRESHOLD_WEAK_PHRASING_WARN = 0.30; // <=30%

export const THRESHOLD_STUFFING_MAX_PERCENT = 0.04; // 4%
export const THRESHOLD_STUFFING_MAX_COUNT = 15;
export const THRESHOLD_MIN_DISTINCT_SKILLS = 5;

// New content thresholds
export const THRESHOLD_EXP_MONTHS_PASS = 24;
export const THRESHOLD_EXP_ROLES_PASS = 3;
export const THRESHOLD_EXP_MONTHS_SOLO_PASS = 36;
export const THRESHOLD_EXP_MONTHS_WARN = 12;
export const THRESHOLD_EXP_ROLES_WARN = 2;

export const THRESHOLD_SKILLS_BREADTH_PASS = 18;
export const THRESHOLD_SKILLS_BREADTH_WARN = 10;

export const THRESHOLD_VERB_STRENGTH_PASS = 0.75;
export const THRESHOLD_VERB_STRENGTH_WARN = 0.45;

export const THRESHOLD_BULLET_WORDS_MIN_PASS = 8;
export const THRESHOLD_BULLET_WORDS_MAX_PASS = 22;
export const THRESHOLD_BULLET_WORDS_MAX_WARN = 30;

export const THRESHOLD_SUMMARY_WORDS_MIN = 25;
export const THRESHOLD_SUMMARY_WORDS_MAX = 90;
export const THRESHOLD_SUMMARY_MIN_SKILLS = 2;

export const THRESHOLD_JD_MATCH_PASS = 70; // 70%
export const THRESHOLD_JD_MATCH_WARN = 40; // 40%

export type CheckStatus = "pass" | "warn" | "fail" | "not_checked";
export type CheckGroup = "format" | "content";

export interface AtsCheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  weight: number;
  detail: string;
  group: CheckGroup;
}

export interface AtsSubScores {
  formatting: number;
  content: number;
}

export interface AtsScoreResult {
  score: number;
  rawScore: number;
  mode: "JOB_TARGETED" | "GENERAL";
  coverage: number;
  notChecked: string[];
  capReason: string | null;
  checks: AtsCheckItem[];
  keywords: KeywordMatchResult | null;
  subScores: AtsSubScores;
}

const STOPWORDS_SET = new Set(STOPWORDS);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,13}/;
const SKILLS_HEADING_REGEX = /^(technical\s+|key\s+|core\s+)?(skills|competencies|technologies|skills\s*(&|and)\s*tools|skills\s*(&|and)\s*interests)$/im;
const ACTION_VERBS_REGEX = /^(led|built|developed|managed|created|designed|implemented|increased|reduced|achieved|launched|automated|architected|spearheaded|optimized|coordinated|delivered|drove|engineered|established|generated|improved|negotiated|orchestrated|resolved|transformed)\b/i;
const WEAK_PHRASE_REGEX = /^[-*•–—\u2022\u25E6\u2023\u25AA\u25CF\s]*(responsible for|worked on|helped with|duties included|involved in)\b/i;

function getBulletLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const bullets: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    const isBullet =
      /^[-*•–—\u2022\u25E6\u2023\u25AA\u25CF]/.test(trimmed) ||
      ACTION_VERBS_REGEX.test(trimmed) ||
      /^[A-Z][a-z]+ed\b/.test(trimmed);
    if (isBullet) {
      bullets.push(trimmed);
    }
  }
  // If no standard bullets detected, consider sentences with >= 4 words as potential bullet items
  if (bullets.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.split(/\s+/).length >= 4) {
        bullets.push(trimmed);
      }
    }
  }
  return bullets;
}

const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseMonthToken(token?: string): number | null {
  if (!token) return null;
  const cleaned = token.trim().toLowerCase();
  if (MONTH_NAMES_MAP[cleaned] !== undefined) {
    return MONTH_NAMES_MAP[cleaned];
  }
  const n = parseInt(cleaned, 10);
  if (!isNaN(n) && n >= 1 && n <= 12) {
    return n - 1;
  }
  return null;
}

export function parseExperienceDates(experienceText: string): { roles: number; months: number } {
  if (!experienceText || !experienceText.trim()) {
    return { roles: 0, months: 0 };
  }

  const regex = /\b(?:([a-zA-Z]{3,9}|\d{1,2})\s*[\/,.-]?\s*)?((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(?:(present|current|now)|(?:([a-zA-Z]{3,9}|\d{1,2})\s*[\/,.-]?\s*)?((?:19|20)\d{2}))\b/gi;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let roles = 0;
  let totalMonths = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(experienceText)) !== null) {
    const startMonthStr = match[1];
    const startYear = parseInt(match[2], 10);
    const isPresent = Boolean(match[3]);
    const endMonthStr = match[4];
    const endYearStr = match[5];

    const startMonth = parseMonthToken(startMonthStr);

    let endYear: number;
    let endMonth: number | null;

    if (isPresent) {
      endYear = currentYear;
      endMonth = currentMonth;
    } else if (endYearStr) {
      endYear = parseInt(endYearStr, 10);
      endMonth = parseMonthToken(endMonthStr);
    } else {
      continue;
    }

    if (startYear > endYear) {
      continue;
    }

    let diffMonths = 0;
    if (startMonth !== null && endMonth !== null) {
      diffMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    } else if (startMonth !== null && endMonth === null) {
      diffMonths = (endYear - startYear) * 12 + (11 - startMonth) + 1;
    } else if (startMonth === null && endMonth !== null) {
      diffMonths = (endYear - startYear) * 12 + (endMonth - 0) + 1;
    } else {
      diffMonths = Math.max(12, (endYear - startYear) * 12);
    }

    if (diffMonths < 1) diffMonths = 1;

    roles++;
    totalMonths += diffMonths;
  }

  return { roles, months: totalMonths };
}

const STRONG_VERBS_SET = new Set(STRONG_ACTION_VERBS);
const MODERATE_VERBS_SET = new Set(MODERATE_ACTION_VERBS);
const WEAK_VERBS_SET = new Set(WEAK_ACTION_VERBS);
const PROFILE_LINKS_REGEX = /(?:linkedin\.com\/(?:in|pub)\/|github\.com\/[a-zA-Z0-9_.-]+|gitlab\.com\/[a-zA-Z0-9_.-]+|https?:\/\/[^\s]+portfolio|[a-zA-Z0-9-]+\.(?:me|dev|io|tech)\b)/i;

/**
 * Pure deterministic ATS scoring engine.
 * No I/O, no network, no LLM calls. Fully reproducible.
 */
export function scoreResume(
  parsed: ParsedResume,
  jdText?: string | null,
  jdKeywords?: string[]
): AtsScoreResult {
  const checks: AtsCheckItem[] = [];
  const text = parsed.text || "";
  const wordCount = parsed.wordCount || (text.trim() ? text.trim().split(/\s+/).length : 0);
  const mode: "JOB_TARGETED" | "GENERAL" = jdText && jdText.trim().length >= 50 ? "JOB_TARGETED" : "GENERAL";

  // a) contact_info (content)
  const hasEmail = EMAIL_REGEX.test(text);
  const hasPhone = PHONE_REGEX.test(text);
  if (hasEmail && hasPhone) {
    checks.push({
      id: "contact_info",
      label: "Contact Information",
      status: "pass",
      weight: WEIGHT_CONTACT_INFO,
      detail: "Both email address and phone number were detected.",
      group: "content",
    });
  } else if (hasEmail && !hasPhone) {
    checks.push({
      id: "contact_info",
      label: "Contact Information",
      status: "warn",
      weight: WEIGHT_CONTACT_INFO,
      detail: "Email detected, but no phone number found.",
      group: "content",
    });
  } else if (!hasEmail && hasPhone) {
    checks.push({
      id: "contact_info",
      label: "Contact Information",
      status: "warn",
      weight: WEIGHT_CONTACT_INFO,
      detail: "Phone number detected, but no email address found.",
      group: "content",
    });
  } else {
    checks.push({
      id: "contact_info",
      label: "Contact Information",
      status: "fail",
      weight: WEIGHT_CONTACT_INFO,
      detail: "Neither email address nor phone number were detected in the text.",
      group: "content",
    });
  }

  // b) sections (content)
  const hasExperience = Boolean(parsed.sections?.experience || parsed.sections?.projects);
  const hasEducation = Boolean(parsed.sections?.education);
  const hasSkills = Boolean(parsed.sections?.skills) || SKILLS_HEADING_REGEX.test(text);

  const missingSections: string[] = [];
  if (!hasExperience) missingSections.push("Experience / Projects");
  if (!hasEducation) missingSections.push("Education");
  if (!hasSkills) missingSections.push("Skills");

  const presentCount = 3 - missingSections.length;
  if (presentCount === 3) {
    checks.push({
      id: "sections",
      label: "Core Resume Sections",
      status: "pass",
      weight: WEIGHT_SECTIONS,
      detail: "All essential sections detected (Experience/Projects, Education, Skills).",
      group: "content",
    });
  } else if (presentCount === 2) {
    checks.push({
      id: "sections",
      label: "Core Resume Sections",
      status: "warn",
      weight: WEIGHT_SECTIONS,
      detail: `Missing section: ${missingSections.join(", ")}.`,
      group: "content",
    });
  } else {
    checks.push({
      id: "sections",
      label: "Core Resume Sections",
      status: "fail",
      weight: WEIGHT_SECTIONS,
      detail: `Incomplete resume structure; missing: ${missingSections.join(", ")}.`,
      group: "content",
    });
  }

  // c) length (content)
  if (wordCount >= THRESHOLD_LENGTH_MIN_PASS && wordCount <= THRESHOLD_LENGTH_MAX_PASS) {
    checks.push({
      id: "length",
      label: "Resume Length",
      status: "pass",
      weight: WEIGHT_LENGTH,
      detail: `Optimal word count (${wordCount} words; recommended 150-900).`,
      group: "content",
    });
  } else if (wordCount < THRESHOLD_LENGTH_MIN_FAIL) {
    checks.push({
      id: "length",
      label: "Resume Length",
      status: "fail",
      weight: WEIGHT_LENGTH,
      detail: `Resume is too short (${wordCount} words; minimum recommended is 150).`,
      group: "content",
    });
  } else if (wordCount > THRESHOLD_LENGTH_MAX_FAIL) {
    checks.push({
      id: "length",
      label: "Resume Length",
      status: "fail",
      weight: WEIGHT_LENGTH,
      detail: `Resume is excessively long (${wordCount} words; maximum recommended is 900).`,
      group: "content",
    });
  } else {
    checks.push({
      id: "length",
      label: "Resume Length",
      status: "warn",
      weight: WEIGHT_LENGTH,
      detail: `Resume word count (${wordCount} words) is outside the ideal 150-900 word range.`,
      group: "content",
    });
  }

  // d) quantified_impact & e) weak_phrasing (content)
  const bullets = getBulletLines(text);
  const totalBullets = bullets.length;

  let quantifiedCount = 0;
  let weakCount = 0;

  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (/\d|%|[$€£₹]/.test(b)) {
      quantifiedCount++;
    }
    if (WEAK_PHRASE_REGEX.test(b)) {
      weakCount++;
    }
  }

  const quantRatio = totalBullets > 0 ? quantifiedCount / totalBullets : 0;
  const weakRatio = totalBullets > 0 ? weakCount / totalBullets : 0;

  if (quantRatio >= THRESHOLD_QUANTIFIED_PASS) {
    checks.push({
      id: "quantified_impact",
      label: "Quantified Impact",
      status: "pass",
      weight: WEIGHT_QUANTIFIED_IMPACT,
      detail: `${Math.round(quantRatio * 100)}% of bullets (${quantifiedCount}/${totalBullets}) contain metrics, digits, or percentages.`,
      group: "content",
    });
  } else if (quantRatio >= THRESHOLD_QUANTIFIED_WARN) {
    checks.push({
      id: "quantified_impact",
      label: "Quantified Impact",
      status: "warn",
      weight: WEIGHT_QUANTIFIED_IMPACT,
      detail: `${Math.round(quantRatio * 100)}% of bullets (${quantifiedCount}/${totalBullets}) contain metrics. Aim for at least 25%.`,
      group: "content",
    });
  } else {
    checks.push({
      id: "quantified_impact",
      label: "Quantified Impact",
      status: "fail",
      weight: WEIGHT_QUANTIFIED_IMPACT,
      detail: `Only ${Math.round(quantRatio * 100)}% of bullets (${quantifiedCount}/${totalBullets}) contain measurable numbers, percentages, or metrics.`,
      group: "content",
    });
  }

  if (weakRatio < THRESHOLD_WEAK_PHRASING_PASS) {
    checks.push({
      id: "weak_phrasing",
      label: "Action Verbs & Phrasing",
      status: "pass",
      weight: WEIGHT_WEAK_PHRASING,
      detail: `Strong active phrasing (only ${Math.round(weakRatio * 100)}% passive or weak phrases).`,
      group: "content",
    });
  } else if (weakRatio <= THRESHOLD_WEAK_PHRASING_WARN) {
    checks.push({
      id: "weak_phrasing",
      label: "Action Verbs & Phrasing",
      status: "warn",
      weight: WEIGHT_WEAK_PHRASING,
      detail: `${Math.round(weakRatio * 100)}% of bullets start with weak phrases like "responsible for" or "worked on". Use strong action verbs.`,
      group: "content",
    });
  } else {
    checks.push({
      id: "weak_phrasing",
      label: "Action Verbs & Phrasing",
      status: "fail",
      weight: WEIGHT_WEAK_PHRASING,
      detail: `${Math.round(weakRatio * 100)}% of bullets start with weak phrases like "responsible for" or "duties included".`,
      group: "content",
    });
  }

  // f) file_readability (format)
  if (parsed.fileType === "image") {
    checks.push({
      id: "file_readability",
      label: "ATS File Readability",
      status: "fail",
      weight: WEIGHT_FILE_READABILITY,
      detail: "Image resumes cannot be read by most ATS systems. Upload a text-based PDF or DOCX.",
      group: "format",
    });
  } else if (parsed.structure?.ocrUsed && parsed.fileType === "pdf") {
    checks.push({
      id: "file_readability",
      label: "ATS File Readability",
      status: "warn",
      weight: WEIGHT_FILE_READABILITY,
      detail: "PDF had no extractable text layer and was parsed using OCR. May contain OCR artifacts.",
      group: "format",
    });
  } else {
    checks.push({
      id: "file_readability",
      label: "ATS File Readability",
      status: "pass",
      weight: WEIGHT_FILE_READABILITY,
      detail: "Document contains a clean, directly parseable text layer.",
      group: "format",
    });
  }

  // g) Layout heuristics: tables, images, columns, header_footer, fonts (format)
  const st = parsed.structure;

  // tables [10] (format)
  if (!st || st.tableCount === null) {
    checks.push({
      id: "tables",
      label: "Table Formatting",
      status: "not_checked",
      weight: WEIGHT_TABLES,
      detail: "Table structure cannot be measured reliably from a PDF or image text layer.",
      group: "format",
    });
  } else if (st.tableCount > 0) {
    checks.push({
      id: "tables",
      label: "Table Formatting",
      status: "fail",
      weight: WEIGHT_TABLES,
      detail: `Detected ${st.tableCount} table(s). Tables can break ATS text flow and reading order.`,
      group: "format",
    });
  } else {
    checks.push({
      id: "tables",
      label: "Table Formatting",
      status: "pass",
      weight: WEIGHT_TABLES,
      detail: "No tables detected (clean single-stream text layout).",
      group: "format",
    });
  }

  // images [6] (format)
  if (!st || st.imageCount === null) {
    checks.push({
      id: "images",
      label: "Embedded Images & Graphics",
      status: "not_checked",
      weight: WEIGHT_IMAGES,
      detail: "Embedded image count cannot be measured reliably from a PDF text layer.",
      group: "format",
    });
  } else if (st.imageCount > 0) {
    checks.push({
      id: "images",
      label: "Embedded Images & Graphics",
      status: "warn",
      weight: WEIGHT_IMAGES,
      detail: `Detected ${st.imageCount} embedded image(s) or graphic(s). ATS parsers cannot read graphics.`,
      group: "format",
    });
  } else {
    checks.push({
      id: "images",
      label: "Embedded Images & Graphics",
      status: "pass",
      weight: WEIGHT_IMAGES,
      detail: "No embedded images or graphics detected.",
      group: "format",
    });
  }

  // columns [8] (format)
  if (!st || st.columnCount === null) {
    checks.push({
      id: "columns",
      label: "Column Layout",
      status: "not_checked",
      weight: WEIGHT_COLUMNS,
      detail: "Multi-column layout cannot be measured reliably from a PDF text layer.",
      group: "format",
    });
  } else if (st.columnCount > 1) {
    checks.push({
      id: "columns",
      label: "Column Layout",
      status: "fail",
      weight: WEIGHT_COLUMNS,
      detail: `Detected multi-column layout (${st.columnCount} columns). Multi-column layouts often scramble ATS reading order.`,
      group: "format",
    });
  } else {
    checks.push({
      id: "columns",
      label: "Column Layout",
      status: "pass",
      weight: WEIGHT_COLUMNS,
      detail: "Clean single-column layout detected.",
      group: "format",
    });
  }

  // header_footer [5] (format)
  if (!st || st.hasHeaderFooterContent === null) {
    checks.push({
      id: "header_footer",
      label: "Header & Footer Separation",
      status: "not_checked",
      weight: WEIGHT_HEADER_FOOTER,
      detail: "Header and footer content cannot be distinguished from a PDF text layer.",
      group: "format",
    });
  } else if (st.hasHeaderFooterContent) {
    checks.push({
      id: "header_footer",
      label: "Header & Footer Separation",
      status: "warn",
      weight: WEIGHT_HEADER_FOOTER,
      detail: "Text detected in headers or footers. Key information in headers/footers is frequently skipped by ATS.",
      group: "format",
    });
  } else {
    checks.push({
      id: "header_footer",
      label: "Header & Footer Separation",
      status: "pass",
      weight: WEIGHT_HEADER_FOOTER,
      detail: "No critical text trapped in separate document headers or footers.",
      group: "format",
    });
  }

  // fonts [3] (format)
  if (!st || st.distinctFontCount === null) {
    checks.push({
      id: "fonts",
      label: "Font Consistency",
      status: "not_checked",
      weight: WEIGHT_FONTS,
      detail: "Font variety cannot be measured reliably from a PDF text layer.",
      group: "format",
    });
  } else if (st.distinctFontCount > 3) {
    checks.push({
      id: "fonts",
      label: "Font Consistency",
      status: "warn",
      weight: WEIGHT_FONTS,
      detail: `Detected ${st.distinctFontCount} distinct fonts. Standard ATS best practice recommends 1-2 standard fonts.`,
      group: "format",
    });
  } else {
    checks.push({
      id: "fonts",
      label: "Font Consistency",
      status: "pass",
      weight: WEIGHT_FONTS,
      detail: `Consistent typography (${st.distinctFontCount} font(s)).`,
      group: "format",
    });
  }

  // h) keyword_density (content)
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9_#+.-]/g, " ")
    .split(/\s+/);

  const wordCounts: Record<string, number> = {};
  for (let i = 0; i < words.length; i++) {
    const w = words[i].trim().replace(/^[-.]+|[-.]+$/g, "");
    if (w.length >= 3 && !/^\d+$/.test(w) && !STOPWORDS_SET.has(w)) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
  }

  let stuffedWord: string | null = null;
  let stuffedCount = 0;
  let stuffedRatio = 0;
  const countedWords = Object.keys(wordCounts);
  for (let i = 0; i < countedWords.length; i++) {
    const w = countedWords[i];
    const cnt = wordCounts[w];
    const ratio = wordCount > 0 ? cnt / wordCount : 0;
    if (cnt > THRESHOLD_STUFFING_MAX_COUNT || ratio > THRESHOLD_STUFFING_MAX_PERCENT) {
      stuffedWord = w;
      stuffedCount = cnt;
      stuffedRatio = ratio;
      break;
    }
  }

  let distinctSkillCount = 0;
  for (let i = 0; i < SKILL_TERMS.length; i++) {
    if (termMatches(text, SKILL_TERMS[i])) {
      distinctSkillCount++;
    }
  }

  if (stuffedWord) {
    checks.push({
      id: "keyword_density",
      label: "Keyword Density & Stuffing",
      status: "fail",
      weight: WEIGHT_KEYWORD_DENSITY,
      detail: `Possible keyword stuffing: "${stuffedWord}" appears ${stuffedCount} times (${(stuffedRatio * 100).toFixed(1)}% of total words).`,
      group: "content",
    });
  } else if (distinctSkillCount < THRESHOLD_MIN_DISTINCT_SKILLS) {
    checks.push({
      id: "keyword_density",
      label: "Keyword Density & Stuffing",
      status: "warn",
      weight: WEIGHT_KEYWORD_DENSITY,
      detail: `Only ${distinctSkillCount} recognized technical or domain skill terms detected. Consider highlighting specific tools and methods.`,
      group: "content",
    });
  } else {
    checks.push({
      id: "keyword_density",
      label: "Keyword Density & Stuffing",
      status: "pass",
      weight: WEIGHT_KEYWORD_DENSITY,
      detail: `Natural keyword distribution with ${distinctSkillCount} recognized skill terms.`,
      group: "content",
    });
  }

  // 1. experience_depth (content)
  const expStats = parseExperienceDates(parsed.sections?.experience || "");
  const { roles: expRoles, months: expMonths } = expStats;
  if (
    expMonths >= THRESHOLD_EXP_MONTHS_SOLO_PASS ||
    (expMonths >= THRESHOLD_EXP_MONTHS_PASS && expRoles >= THRESHOLD_EXP_ROLES_PASS)
  ) {
    checks.push({
      id: "experience_depth",
      label: "Experience Depth & Progression",
      status: "pass",
      weight: WEIGHT_EXPERIENCE_DEPTH,
      detail: `Demonstrates strong experience depth with ${expRoles} role(s) spanning ${expMonths} month(s).`,
      group: "content",
    });
  } else if (expMonths >= THRESHOLD_EXP_MONTHS_WARN || expRoles >= THRESHOLD_EXP_ROLES_WARN) {
    checks.push({
      id: "experience_depth",
      label: "Experience Depth & Progression",
      status: "warn",
      weight: WEIGHT_EXPERIENCE_DEPTH,
      detail: `Found ${expRoles} role(s) spanning ${expMonths} month(s). Recommended is 3+ roles or 24+ months for senior/mid levels.`,
      group: "content",
    });
  } else {
    checks.push({
      id: "experience_depth",
      label: "Experience Depth & Progression",
      status: "fail",
      weight: WEIGHT_EXPERIENCE_DEPTH,
      detail: `Limited experience detected (${expRoles} role(s), ${expMonths} month(s)). Consider expanding your work history details.`,
      group: "content",
    });
  }

  // 2. skills_breadth (content)
  if (distinctSkillCount >= THRESHOLD_SKILLS_BREADTH_PASS) {
    checks.push({
      id: "skills_breadth",
      label: "Skills Breadth & Variety",
      status: "pass",
      weight: WEIGHT_SKILLS_BREADTH,
      detail: `Strong skills breadth with ${distinctSkillCount} distinct recognized skills found.`,
      group: "content",
    });
  } else if (distinctSkillCount >= THRESHOLD_SKILLS_BREADTH_WARN) {
    checks.push({
      id: "skills_breadth",
      label: "Skills Breadth & Variety",
      status: "warn",
      weight: WEIGHT_SKILLS_BREADTH,
      detail: `Found ${distinctSkillCount} recognized skills. Aim for 18 or more to demonstrate broader technical expertise.`,
      group: "content",
    });
  } else {
    checks.push({
      id: "skills_breadth",
      label: "Skills Breadth & Variety",
      status: "fail",
      weight: WEIGHT_SKILLS_BREADTH,
      detail: `Only ${distinctSkillCount} recognized skills identified. Include more industry-relevant tools and competencies.`,
      group: "content",
    });
  }

  // 3. action_verb_strength (content)
  let strongVerbCount = 0;
  let moderateVerbCount = 0;
  let weakVerbCount = 0;

  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    const cleaned = b.replace(/^[-*•–—\u2022\u25E6\u2023\u25AA\u25CF\s\d.)]+/, "").trim();
    const match = cleaned.match(/^([a-zA-Z]+)/);
    const firstWord = match ? match[1].toLowerCase() : "";
    if (STRONG_VERBS_SET.has(firstWord)) {
      strongVerbCount++;
    } else if (MODERATE_VERBS_SET.has(firstWord)) {
      moderateVerbCount++;
    } else if (WEAK_VERBS_SET.has(firstWord)) {
      weakVerbCount++;
    }
  }

  const verbScore = bullets.length > 0
    ? (strongVerbCount + 0.5 * moderateVerbCount) / bullets.length
    : 0;
  const verbPct = Math.round(verbScore * 100);

  if (verbScore >= THRESHOLD_VERB_STRENGTH_PASS) {
    checks.push({
      id: "action_verb_strength",
      label: "Action Verb Strength",
      status: "pass",
      weight: WEIGHT_ACTION_VERB_STRENGTH,
      detail: `Strong action verbs lead ${verbPct}% of bullet points (${strongVerbCount} strong, ${moderateVerbCount} moderate).`,
      group: "content",
    });
  } else if (verbScore >= THRESHOLD_VERB_STRENGTH_WARN) {
    checks.push({
      id: "action_verb_strength",
      label: "Action Verb Strength",
      status: "warn",
      weight: WEIGHT_ACTION_VERB_STRENGTH,
      detail: `Action verb score is ${verbPct}% (${strongVerbCount} strong, ${moderateVerbCount} moderate). Replace passive or moderate verbs with impactful action verbs.`,
      group: "content",
    });
  } else {
    checks.push({
      id: "action_verb_strength",
      label: "Action Verb Strength",
      status: "fail",
      weight: WEIGHT_ACTION_VERB_STRENGTH,
      detail: `Action verb score is ${verbPct}%. Most bullets start with weak or unclassified verbs. Aim for 75%+ strong verbs.`,
      group: "content",
    });
  }

  // 4. bullet_readability (content)
  let totalBulletWords = 0;
  for (let i = 0; i < bullets.length; i++) {
    const wordTokens = bullets[i].trim().split(/\s+/);
    let count = 0;
    for (let j = 0; j < wordTokens.length; j++) {
      if (wordTokens[j]) count++;
    }
    totalBulletWords += count;
  }
  const avgBulletWords = bullets.length > 0 ? totalBulletWords / bullets.length : 0;

  if (
    bullets.length > 0 &&
    avgBulletWords >= THRESHOLD_BULLET_WORDS_MIN_PASS &&
    avgBulletWords <= THRESHOLD_BULLET_WORDS_MAX_PASS
  ) {
    checks.push({
      id: "bullet_readability",
      label: "Bullet Readability & Length",
      status: "pass",
      weight: WEIGHT_BULLET_READABILITY,
      detail: `Average bullet length is ${avgBulletWords.toFixed(1)} words (optimal 8-22 words).`,
      group: "content",
    });
  } else if (
    bullets.length > 0 &&
    ((avgBulletWords > THRESHOLD_BULLET_WORDS_MAX_PASS && avgBulletWords <= THRESHOLD_BULLET_WORDS_MAX_WARN) ||
      avgBulletWords < THRESHOLD_BULLET_WORDS_MIN_PASS)
  ) {
    checks.push({
      id: "bullet_readability",
      label: "Bullet Readability & Length",
      status: "warn",
      weight: WEIGHT_BULLET_READABILITY,
      detail: `Average bullet length is ${avgBulletWords.toFixed(1)} words (${avgBulletWords < 8 ? "too brief; add more context and metrics" : "slightly long; aim for 8-22 words"}).`,
      group: "content",
    });
  } else {
    checks.push({
      id: "bullet_readability",
      label: "Bullet Readability & Length",
      status: "fail",
      weight: WEIGHT_BULLET_READABILITY,
      detail:
        bullets.length === 0
          ? "No bullet points found in the resume."
          : `Average bullet length is ${avgBulletWords.toFixed(1)} words (exceeds 30 words; too verbose for quick ATS scanning).`,
      group: "content",
    });
  }

  // 5. profile_links (content)
  const hasProfileLink = PROFILE_LINKS_REGEX.test(text);
  if (hasProfileLink) {
    checks.push({
      id: "profile_links",
      label: "Professional Profile Links",
      status: "pass",
      weight: WEIGHT_PROFILE_LINKS,
      detail: "Professional profile link detected (LinkedIn, GitHub, or portfolio).",
      group: "content",
    });
  } else {
    checks.push({
      id: "profile_links",
      label: "Professional Profile Links",
      status: "warn",
      weight: WEIGHT_PROFILE_LINKS,
      detail: "No LinkedIn, GitHub, or portfolio link detected. Adding links helps recruiters verify your work.",
      group: "content",
    });
  }

  // 6. summary_quality (content)
  const summaryRaw = parsed.sections?.summary ? parsed.sections.summary.trim() : "";
  if (!summaryRaw) {
    checks.push({
      id: "summary_quality",
      label: "Professional Summary Quality",
      status: "fail",
      weight: WEIGHT_SUMMARY_QUALITY,
      detail: "No professional summary or profile section found. A strong 25-90 word summary helps hook recruiters.",
      group: "content",
    });
  } else {
    const summaryTokens = summaryRaw.split(/\s+/);
    let summaryWordCount = 0;
    for (let i = 0; i < summaryTokens.length; i++) {
      if (summaryTokens[i]) summaryWordCount++;
    }

    let summarySkillCount = 0;
    for (let i = 0; i < SKILL_TERMS.length; i++) {
      if (termMatches(summaryRaw, SKILL_TERMS[i])) {
        summarySkillCount++;
      }
    }

    const summaryHasNumber = /\d/.test(summaryRaw);
    const isWordCountGood =
      summaryWordCount >= THRESHOLD_SUMMARY_WORDS_MIN && summaryWordCount <= THRESHOLD_SUMMARY_WORDS_MAX;
    const hasSubstance = summarySkillCount >= THRESHOLD_SUMMARY_MIN_SKILLS || summaryHasNumber;

    if (isWordCountGood && hasSubstance) {
      checks.push({
        id: "summary_quality",
        label: "Professional Summary Quality",
        status: "pass",
        weight: WEIGHT_SUMMARY_QUALITY,
        detail: `Targeted summary (${summaryWordCount} words) with specific skills and/or metrics.`,
        group: "content",
      });
    } else {
      let reason = "";
      if (summaryWordCount < THRESHOLD_SUMMARY_WORDS_MIN) {
        reason = `Summary is brief (${summaryWordCount} words; recommended 25-90).`;
      } else if (summaryWordCount > THRESHOLD_SUMMARY_WORDS_MAX) {
        reason = `Summary is overly long (${summaryWordCount} words; keep it within 25-90 words).`;
      } else {
        reason = `Summary is generic (${summaryWordCount} words, but lacks recognized skill terms or metrics).`;
      }
      checks.push({
        id: "summary_quality",
        label: "Professional Summary Quality",
        status: "warn",
        weight: WEIGHT_SUMMARY_QUALITY,
        detail: `${reason} Include key skills and achievements to stand out.`,
        group: "content",
      });
    }
  }

  // i) jd_match (content, JOB_TARGETED mode ONLY)
  let keywordResults: KeywordMatchResult | null = null;
  if (mode === "JOB_TARGETED" && jdText) {
    const finalJdKeywords = jdKeywords !== undefined ? jdKeywords : extractJdKeywords(jdText);
    const inferred = (finalJdKeywords as any)?.inferredFromLlm || [];
    keywordResults = matchKeywords(text, finalJdKeywords, inferred);
    const { matchPercent, matched, missing } = keywordResults;
    const keywordCount = matched.length + missing.length;
    const isNotScored = keywordCount < MIN_JD_KEYWORDS_TO_SCORE;

    if (isNotScored) {
      checks.push({
        id: "jd_match",
        label: "Job Description Keyword Match",
        status: "not_checked",
        weight: WEIGHT_JD_MATCH,
        detail: "Too few keywords found in the job description to score a match.",
        group: "content",
      });
    } else {
      const isLowTrust = Boolean(keywordResults.lowTrust || keywordCount < THRESHOLD_LOW_TRUST_KEYWORDS);
      const lowTrustSuffix = isLowTrust
        ? ` (Note: only ${keywordCount} keyword${keywordCount === 1 ? "" : "s"} found in job description; match rate may be unreliable)`
        : "";

      if (matchPercent >= THRESHOLD_JD_MATCH_PASS) {
        checks.push({
          id: "jd_match",
          label: "Job Description Keyword Match",
          status: "pass",
          weight: WEIGHT_JD_MATCH,
          detail: `Matched ${matched.length} of ${finalJdKeywords.length} target keywords (${matchPercent}% match).${lowTrustSuffix}`,
          group: "content",
        });
      } else if (matchPercent >= THRESHOLD_JD_MATCH_WARN) {
        const topMissing = missing.slice(0, 5).join(", ");
        checks.push({
          id: "jd_match",
          label: "Job Description Keyword Match",
          status: "warn",
          weight: WEIGHT_JD_MATCH,
          detail: `Moderate keyword alignment: matched ${matched.length} of ${finalJdKeywords.length} keywords (${matchPercent}%). Missing: ${topMissing}.${lowTrustSuffix}`,
          group: "content",
        });
      } else {
        const topMissing = missing.slice(0, 5).join(", ");
        checks.push({
          id: "jd_match",
          label: "Job Description Keyword Match",
          status: "fail",
          weight: WEIGHT_JD_MATCH,
          detail: `Low keyword alignment: matched ${matched.length} of ${finalJdKeywords.length} keywords (${matchPercent}%). Missing key terms: ${topMissing}.${lowTrustSuffix}`,
          group: "content",
        });
      }
    }
  }

  // Calculate final sub-scores:
  // formatting = round(100 * formatEarned / formatPossible)
  // content = round(100 * contentEarned / contentPossible)
  // not_checked excluded from both earned and possible
  let formatEarned = 0;
  let formatPossible = 0;
  let contentEarned = 0;
  let contentPossible = 0;

  let totalWeightForMode = 0;
  let totalPossible = 0;
  const notChecked: string[] = [];

  for (let i = 0; i < checks.length; i++) {
    const c = checks[i];
    totalWeightForMode += c.weight;
    if (c.status === "not_checked") {
      notChecked.push(c.label);
      continue;
    }
    totalPossible += c.weight;
    const earnedWeight = c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0;
    if (c.group === "format") {
      formatPossible += c.weight;
      formatEarned += earnedWeight;
    } else {
      contentPossible += c.weight;
      contentEarned += earnedWeight;
    }
  }

  const formatting = formatPossible > 0 ? Math.round((100 * formatEarned) / formatPossible) : 0;
  const content = contentPossible > 0 ? Math.round((100 * contentEarned) / contentPossible) : 0;
  const subScores: AtsSubScores = {
    formatting,
    content,
  };

  const rawScore = Math.round(0.25 * formatting + 0.75 * content);
  const coverage = totalWeightForMode > 0 ? Math.round((100 * totalPossible) / totalWeightForMode) : 0;

  // Check score caps
  let capReason: string | null = null;
  let capLimit: number | null = null;

  let hasStuffing = false;
  let hasImageFail = false;

  for (let i = 0; i < checks.length; i++) {
    if (checks[i].id === "keyword_density" && checks[i].status === "fail") {
      hasStuffing = true;
    }
    if (checks[i].id === "file_readability" && checks[i].status === "fail") {
      hasImageFail = true;
    }
  }

  if (hasImageFail && hasStuffing) {
    capLimit = Math.min(SCORE_CAP_IMAGE_RESUME, SCORE_CAP_KEYWORD_STUFFING);
    if (rawScore > capLimit) {
      capReason = `Capped at ${capLimit}: image resume format and keyword stuffing detected`;
    }
  } else if (hasImageFail) {
    capLimit = SCORE_CAP_IMAGE_RESUME;
    if (rawScore > capLimit) {
      capReason = `Capped at ${SCORE_CAP_IMAGE_RESUME}: image resumes cannot be read by most ATS`;
    }
  } else if (hasStuffing) {
    capLimit = SCORE_CAP_KEYWORD_STUFFING;
    if (rawScore > capLimit) {
      capReason = `Capped at ${SCORE_CAP_KEYWORD_STUFFING}: keyword stuffing detected`;
    }
  }

  const score = capLimit !== null && rawScore > capLimit ? capLimit : rawScore;

  return {
    score,
    rawScore,
    mode,
    coverage,
    notChecked,
    capReason,
    checks,
    keywords: keywordResults,
    subScores,
  };
}
