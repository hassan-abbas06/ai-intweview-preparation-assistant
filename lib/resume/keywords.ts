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

/**
 * Extracts up to 25 high-priority keywords from a Job Description.
 * Priority:
 * (a) Known SKILL_TERMS and aliases found in the JD as whole words/phrases.
 * (b) Other tokens appearing 3+ times in the JD (not stopwords or boilerplate, 3+ chars).
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
      if (selected.length >= 25) break;
    }
  }

  // Check aliases directly if under limit
  if (selected.length < 25) {
    for (let i = 0; i < aliasKeys.length; i++) {
      const alias = aliasKeys[i];
      if (termMatches(text, alias)) {
        addKeyword(alias);
        if (selected.length >= 25) break;
      }
    }
  }

  // (b) Other frequent tokens (appear 3+ times, not in stopwords or boilerplate, >=3 letters)
  if (selected.length < 25) {
    const tokenCounts: Record<string, number> = {};
    const tokens = text.replace(/[^a-z0-9_#+.-]/g, " ").split(/\s+/);

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i].trim().replace(/^[-.]+|[-.]+$/g, "");
      if (
        tok.length >= 3 &&
        !/^\d+$/.test(tok) &&
        !STOPWORDS_SET.has(tok) &&
        !BOILERPLATE_SET.has(tok) &&
        !selectedSet.has(tok)
      ) {
        tokenCounts[tok] = (tokenCounts[tok] || 0) + 1;
      }
    }

    const tokenCandidates: { word: string; count: number }[] = [];
    const countedWords = Object.keys(tokenCounts);
    for (let i = 0; i < countedWords.length; i++) {
      const w = countedWords[i];
      if (tokenCounts[w] >= 3) {
        tokenCandidates.push({ word: w, count: tokenCounts[w] });
      }
    }

    tokenCandidates.sort((a, b) => b.count - a.count);

    for (let i = 0; i < tokenCandidates.length; i++) {
      if (selected.length >= 25) break;
      addKeyword(tokenCandidates[i].word);
    }
  }

  return selected.slice(0, 25);
}

export interface KeywordMatchResult {
  matchPercent: number;
  matched: string[];
  missing: string[];
}

/**
 * Literal whole-word presence check, case-insensitive, alias-aware.
 */
export function matchKeywords(resumeText: string, keywords: string[]): KeywordMatchResult {
  if (!keywords || keywords.length === 0) {
    return { matchPercent: 100, matched: [], missing: [] };
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
  return { matchPercent, matched, missing };
}
