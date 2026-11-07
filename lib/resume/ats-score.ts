import { ParsedResume } from "./parse";
import { extractJdKeywords, matchKeywords, termMatches, KeywordMatchResult } from "./keywords";
import { SKILL_TERMS, STOPWORDS } from "./skill-terms";

// Constant score caps
export const SCORE_CAP_KEYWORD_STUFFING = 70;
export const SCORE_CAP_IMAGE_RESUME = 50;

// Constant check weights
export const WEIGHT_CONTACT_INFO = 10;
export const WEIGHT_SECTIONS = 15;
export const WEIGHT_LENGTH = 8;
export const WEIGHT_QUANTIFIED_IMPACT = 12;
export const WEIGHT_WEAK_PHRASING = 8;
export const WEIGHT_FILE_READABILITY = 10;
export const WEIGHT_TABLES = 10;
export const WEIGHT_IMAGES = 6;
export const WEIGHT_COLUMNS = 8;
export const WEIGHT_HEADER_FOOTER = 5;
export const WEIGHT_FONTS = 3;
export const WEIGHT_KEYWORD_DENSITY = 8;
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

export const THRESHOLD_JD_MATCH_PASS = 70; // 70%
export const THRESHOLD_JD_MATCH_WARN = 40; // 40%

export type CheckStatus = "pass" | "warn" | "fail" | "not_checked";

export interface AtsCheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  weight: number;
  detail: string;
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

/**
 * Pure deterministic ATS scoring engine.
 * No I/O, no network, no LLM calls. Fully reproducible.
 */
export function scoreResume(
  parsed: ParsedResume,
  jdText?: string | null
): AtsScoreResult {
  const checks: AtsCheckItem[] = [];
  const text = parsed.text || "";
  const wordCount = parsed.wordCount || (text.trim() ? text.trim().split(/\s+/).length : 0);
  const mode: "JOB_TARGETED" | "GENERAL" = jdText && jdText.trim().length >= 50 ? "JOB_TARGETED" : "GENERAL";

  // a) contact_info [10]
  const hasEmail = EMAIL_REGEX.test(text);
  const hasPhone = PHONE_REGEX.test(text);
  if (hasEmail && hasPhone) {
    checks.push({
      id: "contact_info",
      label: "Contact Information",
      status: "pass",
      weight: WEIGHT_CONTACT_INFO,
      detail: "Both email address and phone number were detected.",
    });
  } else if (hasEmail && !hasPhone) {
    checks.push({
      id: "contact_info",
      label: "Contact Information",
      status: "warn",
      weight: WEIGHT_CONTACT_INFO,
      detail: "Email detected, but no phone number found.",
    });
  } else if (!hasEmail && hasPhone) {
    checks.push({
      id: "contact_info",
      label: "Contact Information",
      status: "warn",
      weight: WEIGHT_CONTACT_INFO,
      detail: "Phone number detected, but no email address found.",
    });
  } else {
    checks.push({
      id: "contact_info",
      label: "Contact Information",
      status: "fail",
      weight: WEIGHT_CONTACT_INFO,
      detail: "Neither email address nor phone number were detected in the text.",
    });
  }

  // b) sections [15]
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
    });
  } else if (presentCount === 2) {
    checks.push({
      id: "sections",
      label: "Core Resume Sections",
      status: "warn",
      weight: WEIGHT_SECTIONS,
      detail: `Missing section: ${missingSections.join(", ")}.`,
    });
  } else {
    checks.push({
      id: "sections",
      label: "Core Resume Sections",
      status: "fail",
      weight: WEIGHT_SECTIONS,
      detail: `Incomplete resume structure; missing: ${missingSections.join(", ")}.`,
    });
  }

  // c) length [8]
  if (wordCount >= THRESHOLD_LENGTH_MIN_PASS && wordCount <= THRESHOLD_LENGTH_MAX_PASS) {
    checks.push({
      id: "length",
      label: "Resume Length",
      status: "pass",
      weight: WEIGHT_LENGTH,
      detail: `Optimal word count (${wordCount} words; recommended 150-900).`,
    });
  } else if (wordCount < THRESHOLD_LENGTH_MIN_FAIL) {
    checks.push({
      id: "length",
      label: "Resume Length",
      status: "fail",
      weight: WEIGHT_LENGTH,
      detail: `Resume is too short (${wordCount} words; minimum recommended is 150).`,
    });
  } else if (wordCount > THRESHOLD_LENGTH_MAX_FAIL) {
    checks.push({
      id: "length",
      label: "Resume Length",
      status: "fail",
      weight: WEIGHT_LENGTH,
      detail: `Resume is excessively long (${wordCount} words; maximum recommended is 900).`,
    });
  } else {
    checks.push({
      id: "length",
      label: "Resume Length",
      status: "warn",
      weight: WEIGHT_LENGTH,
      detail: `Resume word count (${wordCount} words) is outside the ideal 150-900 word range.`,
    });
  }

  // d) quantified_impact [12] & e) weak_phrasing [8]
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
    });
  } else if (quantRatio >= THRESHOLD_QUANTIFIED_WARN) {
    checks.push({
      id: "quantified_impact",
      label: "Quantified Impact",
      status: "warn",
      weight: WEIGHT_QUANTIFIED_IMPACT,
      detail: `${Math.round(quantRatio * 100)}% of bullets (${quantifiedCount}/${totalBullets}) contain metrics. Aim for at least 25%.`,
    });
  } else {
    checks.push({
      id: "quantified_impact",
      label: "Quantified Impact",
      status: "fail",
      weight: WEIGHT_QUANTIFIED_IMPACT,
      detail: `Only ${Math.round(quantRatio * 100)}% of bullets (${quantifiedCount}/${totalBullets}) contain measurable numbers, percentages, or metrics.`,
    });
  }

  if (weakRatio < THRESHOLD_WEAK_PHRASING_PASS) {
    checks.push({
      id: "weak_phrasing",
      label: "Action Verbs & Phrasing",
      status: "pass",
      weight: WEIGHT_WEAK_PHRASING,
      detail: `Strong active phrasing (only ${Math.round(weakRatio * 100)}% passive or weak phrases).`,
    });
  } else if (weakRatio <= THRESHOLD_WEAK_PHRASING_WARN) {
    checks.push({
      id: "weak_phrasing",
      label: "Action Verbs & Phrasing",
      status: "warn",
      weight: WEIGHT_WEAK_PHRASING,
      detail: `${Math.round(weakRatio * 100)}% of bullets start with weak phrases like "responsible for" or "worked on". Use strong action verbs.`,
    });
  } else {
    checks.push({
      id: "weak_phrasing",
      label: "Action Verbs & Phrasing",
      status: "fail",
      weight: WEIGHT_WEAK_PHRASING,
      detail: `${Math.round(weakRatio * 100)}% of bullets start with weak phrases like "responsible for" or "duties included".`,
    });
  }

  // f) file_readability [10]
  if (parsed.fileType === "image") {
    checks.push({
      id: "file_readability",
      label: "ATS File Readability",
      status: "fail",
      weight: WEIGHT_FILE_READABILITY,
      detail: "Image resumes cannot be read by most ATS systems. Upload a text-based PDF or DOCX.",
    });
  } else if (parsed.structure?.ocrUsed && parsed.fileType === "pdf") {
    checks.push({
      id: "file_readability",
      label: "ATS File Readability",
      status: "warn",
      weight: WEIGHT_FILE_READABILITY,
      detail: "PDF had no extractable text layer and was parsed using OCR. May contain OCR artifacts.",
    });
  } else {
    checks.push({
      id: "file_readability",
      label: "ATS File Readability",
      status: "pass",
      weight: WEIGHT_FILE_READABILITY,
      detail: "Document contains a clean, directly parseable text layer.",
    });
  }

  // g) Layout heuristics: tables, images, columns, header_footer, fonts
  const st = parsed.structure;

  // tables [10]
  if (!st || st.tableCount === null) {
    checks.push({
      id: "tables",
      label: "Table Formatting",
      status: "not_checked",
      weight: WEIGHT_TABLES,
      detail: "Table structure cannot be measured reliably from a PDF or image text layer.",
    });
  } else if (st.tableCount > 0) {
    checks.push({
      id: "tables",
      label: "Table Formatting",
      status: "fail",
      weight: WEIGHT_TABLES,
      detail: `Detected ${st.tableCount} table(s). Tables can break ATS text flow and reading order.`,
    });
  } else {
    checks.push({
      id: "tables",
      label: "Table Formatting",
      status: "pass",
      weight: WEIGHT_TABLES,
      detail: "No tables detected (clean single-stream text layout).",
    });
  }

  // images [6]
  if (!st || st.imageCount === null) {
    checks.push({
      id: "images",
      label: "Embedded Images & Graphics",
      status: "not_checked",
      weight: WEIGHT_IMAGES,
      detail: "Embedded image count cannot be measured reliably from a PDF text layer.",
    });
  } else if (st.imageCount > 0) {
    checks.push({
      id: "images",
      label: "Embedded Images & Graphics",
      status: "warn",
      weight: WEIGHT_IMAGES,
      detail: `Detected ${st.imageCount} embedded image(s) or graphic(s). ATS parsers cannot read graphics.`,
    });
  } else {
    checks.push({
      id: "images",
      label: "Embedded Images & Graphics",
      status: "pass",
      weight: WEIGHT_IMAGES,
      detail: "No embedded images or graphics detected.",
    });
  }

  // columns [8]
  if (!st || st.columnCount === null) {
    checks.push({
      id: "columns",
      label: "Column Layout",
      status: "not_checked",
      weight: WEIGHT_COLUMNS,
      detail: "Multi-column layout cannot be measured reliably from a PDF text layer.",
    });
  } else if (st.columnCount > 1) {
    checks.push({
      id: "columns",
      label: "Column Layout",
      status: "fail",
      weight: WEIGHT_COLUMNS,
      detail: `Detected multi-column layout (${st.columnCount} columns). Multi-column layouts often scramble ATS reading order.`,
    });
  } else {
    checks.push({
      id: "columns",
      label: "Column Layout",
      status: "pass",
      weight: WEIGHT_COLUMNS,
      detail: "Clean single-column layout detected.",
    });
  }

  // header_footer [5]
  if (!st || st.hasHeaderFooterContent === null) {
    checks.push({
      id: "header_footer",
      label: "Header & Footer Separation",
      status: "not_checked",
      weight: WEIGHT_HEADER_FOOTER,
      detail: "Header and footer content cannot be distinguished from a PDF text layer.",
    });
  } else if (st.hasHeaderFooterContent) {
    checks.push({
      id: "header_footer",
      label: "Header & Footer Separation",
      status: "warn",
      weight: WEIGHT_HEADER_FOOTER,
      detail: "Text detected in headers or footers. Key information in headers/footers is frequently skipped by ATS.",
    });
  } else {
    checks.push({
      id: "header_footer",
      label: "Header & Footer Separation",
      status: "pass",
      weight: WEIGHT_HEADER_FOOTER,
      detail: "No critical text trapped in separate document headers or footers.",
    });
  }

  // fonts [3]
  if (!st || st.distinctFontCount === null) {
    checks.push({
      id: "fonts",
      label: "Font Consistency",
      status: "not_checked",
      weight: WEIGHT_FONTS,
      detail: "Font variety cannot be measured reliably from a PDF text layer.",
    });
  } else if (st.distinctFontCount > 3) {
    checks.push({
      id: "fonts",
      label: "Font Consistency",
      status: "warn",
      weight: WEIGHT_FONTS,
      detail: `Detected ${st.distinctFontCount} distinct fonts. Standard ATS best practice recommends 1-2 standard fonts.`,
    });
  } else {
    checks.push({
      id: "fonts",
      label: "Font Consistency",
      status: "pass",
      weight: WEIGHT_FONTS,
      detail: `Consistent typography (${st.distinctFontCount} font(s)).`,
    });
  }

  // h) keyword_density [8]
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
    });
  } else if (distinctSkillCount < THRESHOLD_MIN_DISTINCT_SKILLS) {
    checks.push({
      id: "keyword_density",
      label: "Keyword Density & Stuffing",
      status: "warn",
      weight: WEIGHT_KEYWORD_DENSITY,
      detail: `Only ${distinctSkillCount} recognized technical or domain skill terms detected. Consider highlighting specific tools and methods.`,
    });
  } else {
    checks.push({
      id: "keyword_density",
      label: "Keyword Density & Stuffing",
      status: "pass",
      weight: WEIGHT_KEYWORD_DENSITY,
      detail: `Natural keyword distribution with ${distinctSkillCount} recognized skill terms.`,
    });
  }

  // i) jd_match [30] (JOB_TARGETED mode ONLY)
  let keywordResults: KeywordMatchResult | null = null;
  if (mode === "JOB_TARGETED" && jdText) {
    const jdKeywords = extractJdKeywords(jdText);
    keywordResults = matchKeywords(text, jdKeywords);
    const { matchPercent, matched, missing } = keywordResults;

    if (matchPercent >= THRESHOLD_JD_MATCH_PASS) {
      checks.push({
        id: "jd_match",
        label: "Job Description Keyword Match",
        status: "pass",
        weight: WEIGHT_JD_MATCH,
        detail: `Matched ${matched.length} of ${jdKeywords.length} target keywords (${matchPercent}% match).`,
      });
    } else if (matchPercent >= THRESHOLD_JD_MATCH_WARN) {
      const topMissing = missing.slice(0, 5).join(", ");
      checks.push({
        id: "jd_match",
        label: "Job Description Keyword Match",
        status: "warn",
        weight: WEIGHT_JD_MATCH,
        detail: `Moderate keyword alignment: matched ${matched.length} of ${jdKeywords.length} keywords (${matchPercent}%). Missing: ${topMissing}.`,
      });
    } else {
      const topMissing = missing.slice(0, 5).join(", ");
      checks.push({
        id: "jd_match",
        label: "Job Description Keyword Match",
        status: "fail",
        weight: WEIGHT_JD_MATCH,
        detail: `Low keyword alignment: matched ${matched.length} of ${jdKeywords.length} keywords (${matchPercent}%). Missing key terms: ${topMissing}.`,
      });
    }
  }

  // Calculate final score: pass earns full, warn earns half, fail earns zero.
  // "not_checked" excluded from BOTH earned and possible.
  let earned = 0;
  let possible = 0;
  let totalWeightForMode = 0;
  const notChecked: string[] = [];

  for (let i = 0; i < checks.length; i++) {
    const c = checks[i];
    totalWeightForMode += c.weight;
    if (c.status === "not_checked") {
      notChecked.push(c.label);
      continue;
    }
    possible += c.weight;
    if (c.status === "pass") {
      earned += c.weight;
    } else if (c.status === "warn") {
      earned += c.weight * 0.5;
    }
  }

  const coverage = totalWeightForMode > 0 ? Math.round((100 * possible) / totalWeightForMode) : 0;
  const rawScore = possible > 0 ? Math.round((earned / possible) * 100) : 0;

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
  };
}
