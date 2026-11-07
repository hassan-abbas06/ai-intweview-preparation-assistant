import { SKILL_TERMS, SKILL_ALIASES, STOPWORDS, JD_BOILERPLATE } from "./skill-terms";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Boundary-safe term presence check that handles punctuation like c++, c#, .net, node.js
 */
export function termMatches(text: string, term: string): boolean {
  if (!text || !term) return false;
  const escaped = escapeRegex(term);
  const pattern = "(?:^|[^a-zA-Z0-9_#+.])" + escaped + "(?=[^a-zA-Z0-9_#+.]|$)";
  const regex = new RegExp(pattern, "i");
  return regex.test(text);
}

// Build reverse alias mapping: canonical -> list of aliases
const REVERSE_ALIASES: Record<string, string[]> = {};
const aliasKeys = Object.keys(SKILL_ALIASES);
for (let i = 0; i < aliasKeys.length; i++) {
  const alias = aliasKeys[i];
  const canonical = SKILL_ALIASES[alias];
  if (!REVERSE_ALIASES[canonical]) {
    REVERSE_ALIASES[canonical] = [];
  }
  if (REVERSE_ALIASES[canonical].indexOf(alias) === -1) {
    REVERSE_ALIASES[canonical].push(alias);
  }
}

// Pre-create Set lookups for stopwords and boilerplate
const STOPWORDS_SET = new Set(STOPWORDS);
const BOILERPLATE_SET = new Set(JD_BOILERPLATE);

export const GENERIC_SINGLE_WORDS: string[] = [
  "operations",
  "customer",
  "team",
  "associate",
  "support",
  "service",
  "management",
  "business",
  "company",
  "work",
  "role",
  "job",
];

const GENERIC_SINGLE_WORDS_SET = new Set(GENERIC_SINGLE_WORDS);

const REQ_HEADING_REGEX = /^(?:basic\s+|minimum\s+|required\s+|key\s+|job\s+|core\s+)?(requirements|qualifications|skills)(?:\s*(?:and|&)\s*(?:requirements|qualifications|skills|experience))?\b[:\-–—]?\s*(.*)$/i;
const STOP_HEADING_REGEX = /^(?:responsibilities|duties|benefits|about\s+us|about\s+the\s+role|about\s+the\s+company|what\s+we\s+offer|compensation|overview|who\s+we\s+are|how\s+to\s+apply)[:\-–—]/i;

const LEADING_FILLER_REGEX = /^(?:strong|good|excellent|basic|proven|solid|effective|great)\b\s*/i;
const TRAILING_WORDS_REGEX = /\s*\b(?:skills|skill|ability|abilities|experience|knowledge)$/i;
const PREFIX_QUALIFIERS_REGEX = /^(?:experience\s+(?:with|in|of)|knowledge\s+of|understanding\s+of|familiarity\s+with|ability\s+to|proficiency\s+(?:in|with)|skills?\s+in|background\s+(?:with|in))\s+/i;

function cleanHeadingPhrase(raw: string): string {
  let phrase = raw
    .trim()
    .replace(/^[-*•–—\u2022\u25E6\u2023\u25AA\u25CF\d.)\s]+/, "")
    .replace(/^[.,;:!?"'\s]+|[.,;:!?"'\s]+$/g, "")
    .trim();

  let prev = "";
  while (phrase && phrase !== prev) {
    prev = phrase;
    phrase = phrase.replace(/^(?:and|or|plus|including|such as)\s+/i, "").trim();
    phrase = phrase.replace(/\s+(?:is a plus|is preferred|is required|preferred|required)$/i, "").trim();
    phrase = phrase.replace(LEADING_FILLER_REGEX, "").trim();
    phrase = phrase.replace(PREFIX_QUALIFIERS_REGEX, "").trim();
    phrase = phrase.replace(TRAILING_WORDS_REGEX, "").trim();
    phrase = phrase.replace(/^[.,;:!?"'\s]+|[.,;:!?"'\s]+$/g, "").trim();
  }

  return phrase;
}

function extractHeadingPhrases(jdText: string): string[] {
  // Normalize inline headings such as ". Requirements: " onto separate lines
  const normalized = jdText.replace(/([.!?])\s+(?=(?:basic\s+|minimum\s+|required\s+|key\s+|job\s+|core\s+)?(?:requirements|qualifications|skills)\b[:\-–—]?)/gi, "$1\n");
  const lines = normalized.split(/\r?\n/);
  const phrases: string[] = [];
  const phraseSet = new Set<string>();

  let inReqSection = false;
  const sectionChunks: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const headingMatch = line.match(REQ_HEADING_REGEX);
    if (headingMatch) {
      inReqSection = true;
      if (headingMatch[2] && headingMatch[2].trim()) {
        sectionChunks.push(headingMatch[2].trim());
      }
      continue;
    }

    if (inReqSection) {
      if (STOP_HEADING_REGEX.test(line)) {
        inReqSection = false;
        continue;
      }
      if (/^(?:responsibilities|duties|benefits|about us|overview)\b/i.test(line)) {
        inReqSection = false;
        continue;
      }
      sectionChunks.push(line);
    }
  }

  function considerPhrase(rawPhrase: string) {
    if (!rawPhrase) return;
    const cleaned = rawPhrase
      .trim()
      .replace(/^[-*•–—\u2022\u25E6\u2023\u25AA\u25CF\d.)\s]+/, "")
      .replace(/^[.,;:!?"'\s]+|[.,;:!?"'\s]+$/g, "")
      .trim();

    if (!cleaned) return;

    const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 3) return;

    const lower = cleaned.toLowerCase();
    if (STOPWORDS_SET.has(lower) || BOILERPLATE_SET.has(lower)) return;

    if (words.length === 1) {
      const w = words[0];
      if (
        w.length < 3 ||
        /^\d+$/.test(w) ||
        STOPWORDS_SET.has(w) ||
        BOILERPLATE_SET.has(w) ||
        GENERIC_SINGLE_WORDS_SET.has(w)
      ) {
        return;
      }
    } else {
      let hasMeaningfulWord = false;
      for (let j = 0; j < words.length; j++) {
        const w = words[j];
        if (!STOPWORDS_SET.has(w) && !BOILERPLATE_SET.has(w)) {
          hasMeaningfulWord = true;
          break;
        }
      }
      if (!hasMeaningfulWord) return;
    }

    if (!phraseSet.has(lower)) {
      phraseSet.add(lower);
      phrases.push(lower);
    }
  }

  for (let i = 0; i < sectionChunks.length; i++) {
    const chunk = sectionChunks[i];
    const sentences = chunk.split(/[.!?]+(?:\s+|$)/);
    for (let s = 0; s < sentences.length; s++) {
      const sentence = sentences[s].trim();
      if (!sentence) continue;

      const items = sentence.split(/[,;\u2022\u25E6\u2023\u25AA\u25CF\-\*\t]+/);
      for (let k = 0; k < items.length; k++) {
        const raw = items[k];
        if (!raw || !raw.trim()) continue;

        const cleaned = cleanHeadingPhrase(raw);
        if (cleaned) {
          considerPhrase(cleaned);
        }
      }
    }
  }

  return phrases;
}

/**
 * Drop a keyword if it is a single word that is already a word inside another extracted keyword,
 * or if it is a single generic word in JD_BOILERPLATE or GENERIC_SINGLE_WORDS.
 */
export function deduplicateKeywords(keywords: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    const isSingleWord = kw.indexOf(" ") === -1;

    if (isSingleWord) {
      if (GENERIC_SINGLE_WORDS_SET.has(kw)) {
        continue;
      }
      if (BOILERPLATE_SET.has(kw)) {
        continue;
      }

      let isInsideOther = false;
      for (let j = 0; j < keywords.length; j++) {
        if (i === j) continue;
        const other = keywords[j];
        if (other.indexOf(" ") !== -1) {
          const otherWords = other.split(/\s+/);
          for (let k = 0; k < otherWords.length; k++) {
            if (otherWords[k] === kw) {
              isInsideOther = true;
              break;
            }
          }
        }
        if (isInsideOther) break;
      }

      if (isInsideOther) {
        continue;
      }
    }

    result.push(kw);
  }

  return result;
}

/**
 * Extracts up to 25 high-priority keywords from a Job Description.
 * Priority:
 * (a) Known SKILL_TERMS and aliases found in the JD as whole words/phrases.
 * (b) Phrases under "Requirements", "Qualifications", or "Skills" headings (1-3 words).
 * (c) Other frequent tokens (appear 3+ times, or 2+ for short JDs <300 words).
 */
export function extractJdKeywords(jdText: string): string[] {
  if (!jdText || typeof jdText !== "string") return [];

  const text = jdText.toLowerCase();
  const selected: string[] = [];
  const selectedSet = new Set<string>();

  // Helper to add keyword canonical
  function addKeyword(term: string) {
    const canonical = SKILL_ALIASES[term] || term;
    if (!selectedSet.has(canonical)) {
      selectedSet.add(canonical);
      selected.push(canonical);
    }
  }

  // (a) First check multi-word skill terms (longer phrases first to avoid greedy single-word collision)
  const sortedSkillTerms = SKILL_TERMS.slice().sort((a, b) => b.length - a.length);
  for (let i = 0; i < sortedSkillTerms.length; i++) {
    const term = sortedSkillTerms[i];
    if (termMatches(text, term)) {
      addKeyword(term);
      if (selected.length >= 35) break;
    }
  }

  // Check aliases directly if under limit
  if (selected.length < 35) {
    for (let i = 0; i < aliasKeys.length; i++) {
      const alias = aliasKeys[i];
      if (termMatches(text, alias)) {
        addKeyword(alias);
        if (selected.length >= 35) break;
      }
    }
  }

  // (b) List-style / capitalized phrases under Requirements, Qualifications, or Skills headings
  if (selected.length < 35) {
    const headingPhrases = extractHeadingPhrases(jdText);
    for (let i = 0; i < headingPhrases.length; i++) {
      addKeyword(headingPhrases[i]);
      if (selected.length >= 35) break;
    }
  }

  // (c) Other frequent tokens (appear 3+ times, or 2+ times for short JDs < 300 words, not in stopwords/boilerplate)
  if (selected.length < 35) {
    const jdWordList = text.replace(/[^a-z0-9_#+.-]/g, " ").split(/\s+/).filter(Boolean);
    const minFreq = jdWordList.length < 300 ? 2 : 3;

    const tokenCounts: Record<string, number> = {};
    const tokens = text.replace(/[^a-z0-9_#+.-]/g, " ").split(/\s+/);

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i].trim().replace(/^[-.]+|[-.]+$/g, "");
      if (
        tok.length >= 3 &&
        !/^\d+$/.test(tok) &&
        !STOPWORDS_SET.has(tok) &&
        !BOILERPLATE_SET.has(tok) &&
        !GENERIC_SINGLE_WORDS_SET.has(tok) &&
        !selectedSet.has(tok)
      ) {
        tokenCounts[tok] = (tokenCounts[tok] || 0) + 1;
      }
    }

    const tokenCandidates: { word: string; count: number }[] = [];
    const countedWords = Object.keys(tokenCounts);
    for (let i = 0; i < countedWords.length; i++) {
      const w = countedWords[i];
      if (tokenCounts[w] >= minFreq) {
        tokenCandidates.push({ word: w, count: tokenCounts[w] });
      }
    }

    tokenCandidates.sort((a, b) => b.count - a.count);

    for (let i = 0; i < tokenCandidates.length; i++) {
      if (selected.length >= 35) break;
      addKeyword(tokenCandidates[i].word);
    }
  }

  const deduplicated = deduplicateKeywords(selected);
  return deduplicated.slice(0, 25);
}

export interface KeywordMatchResult {
  matchPercent: number;
  matched: string[];
  missing: string[];
  lowTrust?: boolean;
}

/**
 * Literal whole-word presence check, case-insensitive, alias-aware.
 */
export function matchKeywords(resumeText: string, keywords: string[]): KeywordMatchResult {
  const isLowTrust = !keywords || keywords.length < 6;

  if (!keywords || keywords.length === 0) {
    const emptyResult: KeywordMatchResult = { matchPercent: 100, matched: [], missing: [] };
    if (isLowTrust) {
      emptyResult.lowTrust = true;
    }
    return emptyResult;
  }

  const text = (resumeText || "").toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    let isPresent = termMatches(text, kw);

    // If not found directly, check if any alias for this canonical term is present
    if (!isPresent && REVERSE_ALIASES[kw]) {
      const aliases = REVERSE_ALIASES[kw];
      for (let j = 0; j < aliases.length; j++) {
        if (termMatches(text, aliases[j])) {
          isPresent = true;
          break;
        }
      }
    }

    // Also check if kw itself was an alias
    if (!isPresent && SKILL_ALIASES[kw]) {
      const canonical = SKILL_ALIASES[kw];
      if (termMatches(text, canonical)) {
        isPresent = true;
      }
    }

    if (isPresent) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const matchPercent = Math.round((matched.length / keywords.length) * 100);
  const result: KeywordMatchResult = { matchPercent, matched, missing };
  if (isLowTrust) {
    result.lowTrust = true;
  }
  return result;
}
