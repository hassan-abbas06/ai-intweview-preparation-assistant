/**
 * Moderation and Profanity Detection Engine for Interview Sessions
 *
 * Implements strict zero-tolerance conduct detection.
 * If a candidate uses vulgar, profane, abusive, or obscene language
 * (such as "fuck", "fuck off", slurs, insults, or leetspeak variations),
 * the interview terminates immediately then and there.
 */

export const TERMINATION_CONDUCT_MESSAGE =
  "This interview has been terminated immediately due to the use of inappropriate and unprofessional language. Professional conduct is required at all times.";

export const TERMINATION_CONDUCT_REASON = "VULGAR_LANGUAGE";

/**
 * Normalizes input text to simplify character masking, leetspeak, and obfuscations
 */
export function normalizeModerationText(text: string): string {
  return text
    .toLowerCase()
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/0/g, "o")
    .replace(/1|!|\|/g, "i")
    .replace(/3/g, "e")
    .replace(/\+/g, "t");
}

/**
 * Checks whether candidate message contains vulgar, profane, obscene, or abusive language.
 * Covers:
 * - Direct F-words and derivatives ("fuck", "fuck off", "fucking", "fucker", "fucked", etc.)
 * - Masked/obfuscated variants ("f*ck", "f**k", "f***", "f.u.c.k", "f-u-c-k", "f u c k", "fuuuck", "fck", "fuk")
 * - Swearing & profanity ("shit", "bullshit", "bitch", "asshole", "cunt", "bastard", "dick", "pussy")
 * - Abusive phrases ("piss off", "eat shit", "suck my dick", "shut the fuck up", "stfu", "gtfo")
 * - Severe slurs and hate speech
 */
export function containsVulgarOrInappropriateLanguage(rawText: string | null | undefined): boolean {
  if (!rawText || typeof rawText !== "string") return false;
  const text = rawText.trim();
  if (!text) return false;

  const normalized = normalizeModerationText(text);

  // 1. Direct F-word pattern matching (catches fuck, f*ck, f**k, f***, f u c k, fuuuck, fck, fuk, etc.)
  const fWordPatterns = [
    /\bf+[u\*_\.\-x]+c+k+/i,             // fuck, f*ck, f..ck, fxxk
    /\bf+[\*_\.\-]+k+/i,                 // f*k, f**k, f-k
    /\bf+[\*_\.\-]{2,}\b/i,              // f***, f**, f----
    /\bf+[\*_\.\-]{2,}\s+(off|you|u|this|that|it|yourself)\b/i, // f*** off
    /\bf+[\*_\.\-]+(ing|ed|er|ers|in)\b/i, // f***ing
    /\bf+u+k+\b/i,                       // fuk
    /\bf+c+k+\b/i,                       // fck
    /\bf+u+q+\b/i,                       // fuq
    /\bf+u+c+k+/i,                       // fuck, fucking, fucker, etc.
    /\bmother\s*fuck/i,                  // motherfucker, mother fucker
    /\b(stfu|gtfo)\b/i,                  // acronyms
    /\bfk\s+(off|you|u|this|that)\b/i,   // fk off, fk you
    /\bf\s+off\b/i,                      // f off
    /\bf\s+u\b/i,                        // f u
  ];

  for (const pattern of fWordPatterns) {
    if (pattern.test(normalized)) return true;
  }

  // 2. Check spaceless string for spaced-out F-word: e.g. "f u c k" or "f.u.c.k" or "f-u-c-k"
  const spaceless = normalized.replace(/[\s\.\-_,\*\+!@#$%^&()]+/g, "");
  if (/fuck|fckoff|fuckoff|stfu|gtfo|motherfuck|foff|fku|fkoff/.test(spaceless)) {
    return true;
  }

  // 3. Multi-word abusive / vulgar phrases
  const phrasePatterns = [
    /\bfuck\s+(off|you|u|this|that|it|yourself|urself)\b/i,
    /\bgo\s+fuck\s+(yourself|urself|off)\b/i,
    /\bshut\s+(the\s+fuck\s+up|up)\b/i,
    /\bpiss\s+off\b/i,
    /\beat\s+shit\b/i,
    /\bsuck\s+(my|a|this)\s+(dick|cock|ass|balls|d)\b/i,
    /\bget\s+fucked\b/i,
    /\bwhat\s+the\s+fuck\b/i,
    /\bwtf\b/i,
    /\bgo\s+to\s+hell\b/i,
    /\bpiece\s+of\s+shit\b/i,
    /\bson\s+of\s+a\s+bitch\b/i,
    /\bkiss\s+my\s+ass\b/i,
  ];

  for (const pattern of phrasePatterns) {
    if (pattern.test(normalized)) return true;
  }

  // 4. Standalone vulgar word boundaries (with character repetition collapsing)
  const collapsedRepeats = normalized.replace(/(.)\1{2,}/g, "$1$1");
  const singleCollapsed = normalized.replace(/(.)\1+/g, "$1");

  const standalonePatterns = [
    /\b(shit|shits|shitting|shitted|shitty|bullshit|horseshit|dipshit|s\*{2,}|s\*\*\*)\b/i,
    /\b(bitch|bitches|bitching|bitchy|b\*{2,})\b/i,
    /\b(bastard|bastards)\b/i,
    /\b(asshole|assholes|dumbass|jackass|fatass|smartass|a\*{2,}hole)\b/i,
    /\b(cunt|cunts|c\*{2,})\b/i,
    /\b(dick|dicks|dickhead|dickheads|cock|cocks|cocksucker|d\*{2,})\b/i,
    /\b(pussy|pussies)\b/i,
    /\b(nigger|niggers|nigga|niggas|faggot|faggots|fag|fags|retard|retarded)\b/i,
    /\b(whore|whores|slut|sluts|twat|wanker)\b/i,
  ];

  for (const pattern of standalonePatterns) {
    if (
      pattern.test(normalized) ||
      pattern.test(collapsedRepeats) ||
      pattern.test(singleCollapsed)
    ) {
      return true;
    }
  }

  return false;
}
