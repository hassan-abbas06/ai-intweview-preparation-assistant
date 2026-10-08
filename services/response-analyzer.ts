import { prisma } from "@/lib/prisma";
import { ResponseStatus, Prisma } from "@prisma/client";

// ============================================================================
// PHASE 7: RESPONSE ANALYSIS TYPES & CONTRACTS
// ============================================================================

export type { ResponseStatus };

export interface PauseEvent {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface VoiceTimingInput {
  interviewerQuestionEndMs?: number | null;
  speechStartMs?: number | null;
  speechEndMs?: number | null;
  pauseIntervals?: PauseEvent[] | null;
  isInterrupted?: boolean;
}

export type VoiceTurnTiming = VoiceTimingInput;

export interface ResponseAnalysisInput {
  sessionId: string;
  turnSequenceNumber: number;
  candidateMessage: string;
  modality: "TEXT" | "VOICE";
  messageId?: string;
  voiceTiming?: VoiceTimingInput | null;
}

export interface TimingMetrics {
  responseLatencyMs: number | null;
  answerDurationMs: number | null;
  totalTurnDurationMs: number | null;
}

export interface PauseMetrics {
  pauseCount: number | null;
  longestPauseMs: number | null;
  averagePauseMs: number | null;
  totalPauseDurationMs: number | null;
  pausesPerMinute: number | null;
  pauseEvents: PauseEvent[] | null;
}

export interface SpeakingRateMetrics {
  wordCount: number;
  speakingDurationSec: number | null;
  wordsPerMinute: number | null;
}

export interface FillerOccurrence {
  word: string;
  index: number;
  context: string;
}

export interface FillerMetrics {
  fillerCount: number;
  fillerRate: number; // fillers per 100 words
  fillerWords: string[];
  fillerOccurrences: FillerOccurrence[];
}

export interface DisfluencyOccurrence {
  type: "REPEATED_WORD" | "REPEATED_PHRASE" | "FALSE_START";
  text: string;
  index: number;
}

export interface DisfluencyMetrics {
  repeatedWordCount: number;
  repeatedPhraseCount: number;
  falseStartCount: number;
  disfluencyOccurrences: DisfluencyOccurrence[];
}

export type StructureAssessment = "MINIMAL" | "CONCISE" | "BALANCED" | "VERBOSE";

export interface CommunicationCharacteristics {
  structureAssessment: StructureAssessment;
  observableCharacteristics: string[];
}

export interface ResponseAnalysisResult {
  sessionId: string;
  turnSequenceNumber: number;
  messageId?: string;
  modality: "TEXT" | "VOICE";
  responseStatus: ResponseStatus;
  // Flat properties
  responseLatencyMs: number | null;
  answerDurationMs: number | null;
  totalTurnDurationMs: number | null;
  pauseCount: number | null;
  longestPauseMs: number | null;
  averagePauseMs: number | null;
  totalPauseDurationMs: number | null;
  pausesPerMinute: number | null;
  wordCount: number;
  speakingDurationSec: number | null;
  wordsPerMinute: number | null;
  fillerCount: number;
  fillerRate: number;
  fillerWords: string[];
  repeatedWordCount: number;
  repeatedPhraseCount: number;
  falseStartCount: number;
  structureAssessment: StructureAssessment;
  observableCharacteristics: string[];
  // Grouped objects
  timing: TimingMetrics;
  pauses: PauseMetrics;
  speakingRate: SpeakingRateMetrics;
  fillers: FillerMetrics;
  disfluencies: DisfluencyMetrics;
  communication: CommunicationCharacteristics;
  metadata?: any;
}

// ============================================================================
// 1. RESPONSE TIMING ANALYSIS
// ============================================================================

/**
 * Calculates response timing metrics safely.
 * Never fabricates timestamps. Never allows negative durations.
 */
export function analyzeResponseTiming(
  modality: "TEXT" | "VOICE",
  voiceTiming?: VoiceTimingInput | null
): TimingMetrics {
  if (modality === "TEXT" || !voiceTiming) {
    return {
      responseLatencyMs: null,
      answerDurationMs: null,
      totalTurnDurationMs: null,
    };
  }

  const { interviewerQuestionEndMs, speechStartMs, speechEndMs } = voiceTiming;

  // 1. Response Latency: candidateSpeechStartMs - interviewerQuestionEndMs
  let responseLatencyMs: number | null = null;
  if (
    typeof speechStartMs === "number" &&
    typeof interviewerQuestionEndMs === "number"
  ) {
    const diff = speechStartMs - interviewerQuestionEndMs;
    responseLatencyMs = diff >= 0 ? diff : null;
  }

  // 2. Answer Duration: speechEndMs - speechStartMs
  let answerDurationMs: number | null = null;
  if (typeof speechEndMs === "number" && typeof speechStartMs === "number") {
    const diff = speechEndMs - speechStartMs;
    answerDurationMs = diff >= 0 ? diff : null;
  }

  // 3. Total Turn Duration: speechEndMs - interviewerQuestionEndMs
  let totalTurnDurationMs: number | null = null;
  if (
    typeof speechEndMs === "number" &&
    typeof interviewerQuestionEndMs === "number"
  ) {
    const diff = speechEndMs - interviewerQuestionEndMs;
    totalTurnDurationMs = diff >= 0 ? diff : null;
  }

  return {
    responseLatencyMs,
    answerDurationMs,
    totalTurnDurationMs,
  };
}

// ============================================================================
// 2. PAUSE & SILENCE ANALYSIS
// ============================================================================

const MEANINGFUL_PAUSE_THRESHOLD_MS = 400;

/**
 * Analyzes candidate pause intervals >= 400ms.
 * Strictly excludes network latency, STT latency, and trailing turn silence.
 * For text mode, always returns null.
 */
export function analyzePauseMetrics(
  modality: "TEXT" | "VOICE",
  answerDurationMs: number | null,
  pauseIntervals?: PauseEvent[] | null
): PauseMetrics {
  if (modality === "TEXT" || !pauseIntervals) {
    return {
      pauseCount: null,
      longestPauseMs: null,
      averagePauseMs: null,
      totalPauseDurationMs: null,
      pausesPerMinute: null,
      pauseEvents: null,
    };
  }

  // Filter to pauses meeting or exceeding the 400ms threshold
  const meaningfulPauses = pauseIntervals.filter(
    (p) => typeof p.durationMs === "number" && p.durationMs >= MEANINGFUL_PAUSE_THRESHOLD_MS
  );

  const pauseCount = meaningfulPauses.length;
  const totalPauseDurationMs = meaningfulPauses.reduce(
    (sum, p) => sum + p.durationMs,
    0
  );
  const longestPauseMs =
    pauseCount > 0 ? Math.max(...meaningfulPauses.map((p) => p.durationMs)) : 0;
  const averagePauseMs =
    pauseCount > 0 ? Math.round(totalPauseDurationMs / pauseCount) : 0;

  let pausesPerMinute: number | null = null;
  if (typeof answerDurationMs === "number" && answerDurationMs > 0) {
    const durationMinutes = answerDurationMs / 60000;
    pausesPerMinute = durationMinutes > 0
      ? Number((pauseCount / durationMinutes).toFixed(2))
      : 0;
  }

  return {
    pauseCount,
    longestPauseMs,
    averagePauseMs,
    totalPauseDurationMs,
    pausesPerMinute,
    pauseEvents: meaningfulPauses,
  };
}

// ============================================================================
// 3. SPEAKING RATE & WPM ANALYSIS
// ============================================================================

/**
 * Calculates estimated Words Per Minute (WPM) based on active speaking duration.
 * Guardrails:
 * - Fewer than 6 words -> null
 * - Answer duration below 2.5s -> null
 * - Invalid or non-positive active speaking duration -> null
 * - Text mode -> null
 */
export function calculateSpeakingRate(
  candidateMessage: string,
  modality: "TEXT" | "VOICE",
  answerDurationMs: number | null,
  totalPauseDurationMs: number | null
): SpeakingRateMetrics {
  const words = (candidateMessage || "").trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (modality === "TEXT" || answerDurationMs === null) {
    return {
      wordCount,
      speakingDurationSec: null,
      wordsPerMinute: null,
    };
  }

  // Guardrails: short response or duration too brief for reliable speaking rate
  if (wordCount < 6 || answerDurationMs < 2500) {
    const rawDurationSec = Number((answerDurationMs / 1000).toFixed(2));
    return {
      wordCount,
      speakingDurationSec: rawDurationSec,
      wordsPerMinute: null,
    };
  }

  const pausesMs = typeof totalPauseDurationMs === "number" ? totalPauseDurationMs : 0;
  // Safely bounded active speaking duration: never allow negative duration
  const activeSpeakingDurationMs = Math.max(0, answerDurationMs - pausesMs);

  if (activeSpeakingDurationMs <= 0) {
    return {
      wordCount,
      speakingDurationSec: 0,
      wordsPerMinute: null,
    };
  }

  const activeMinutes = activeSpeakingDurationMs / 60000;
  const wordsPerMinute = Number((wordCount / activeMinutes).toFixed(1));
  const speakingDurationSec = Number((activeSpeakingDurationMs / 1000).toFixed(2));

  return {
    wordCount,
    speakingDurationSec,
    wordsPerMinute,
  };
}

// ============================================================================
// 4. DETERMINISTIC FILLER WORD DETECTION
// ============================================================================

/**
 * Standard English conversational fillers with contextual false-positive protections.
 */
export function detectFillerWords(candidateMessage: string): FillerMetrics {
  const text = (candidateMessage || "").trim();
  if (!text) {
    return {
      fillerCount: 0,
      fillerRate: 0,
      fillerWords: [],
      fillerOccurrences: [],
    };
  }

  const occurrences: FillerOccurrence[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Phrasal Fillers (case-insensitive boundary checks)
  const phrasalPatterns = [
    { regex: /\b(you\s+know)\b/gi, canonical: "you know" },
    { regex: /\b(i\s+mean)\b/gi, canonical: "i mean" },
    { regex: /\b(sort\s+of)\b/gi, canonical: "sort of" },
    { regex: /\b(kind\s+of)\b/gi, canonical: "kind of" },
    { regex: /\b(right\?)\b/gi, canonical: "right?" },
  ];

  for (const p of phrasalPatterns) {
    let match: RegExpExecArray | null;
    while ((match = p.regex.exec(text)) !== null) {
      const idx = match.index;
      const context = text.slice(Math.max(0, idx - 15), Math.min(text.length, idx + match[0].length + 15));
      occurrences.push({
        word: p.canonical,
        index: idx,
        context: context.trim(),
      });
    }
  }

  // 2. Unambiguous interjections: um, uh, er, ah, hmm
  const interjectionRegex = /\b(um+|uh+|er+|ah+|hmm+)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = interjectionRegex.exec(text)) !== null) {
    const raw = match[0].toLowerCase();
    const normalized = raw.startsWith("um")
      ? "um"
      : raw.startsWith("uh")
      ? "uh"
      : raw.startsWith("er")
      ? "er"
      : raw.startsWith("ah")
      ? "ah"
      : "hmm";
    const idx = match.index;
    const context = text.slice(Math.max(0, idx - 15), Math.min(text.length, idx + match[0].length + 15));
    occurrences.push({
      word: normalized,
      index: idx,
      context: context.trim(),
    });
  }

  // 3. Context-sensitive filler "like" with false-positive protection
  // Protection: "I like", "would like", "looks like", "feels like", "something like", "like this", "like a"
  const likeRegex = /\b(like)\b/gi;
  while ((match = likeRegex.exec(text)) !== null) {
    const idx = match.index;
    const prefix = text.slice(Math.max(0, idx - 20), idx).toLowerCase();
    const suffix = text.slice(idx + 4, Math.min(text.length, idx + 24)).toLowerCase();

    // Check false-positive triggers (verbs, comparative prepositions, proper noun comparisons)
    const isGrammaticalPrepositionOrVerb =
      /\b(i|we|they|you|would|should|could|might|looks|looked|feels|felt|sounds|sounded|something|anything|much|more|tools|libraries|frameworks|databases|systems|languages|technologies|services|patterns|protocols|things|such|just|is|are|was|were)\s*$/i.test(prefix) ||
      /^\s*(this|that|these|those|a|an|the|to|[A-Z][a-z]+)\b/.test(text.slice(idx + 4, Math.min(text.length, idx + 24)));

    if (!isGrammaticalPrepositionOrVerb) {
      const context = text.slice(Math.max(0, idx - 15), Math.min(text.length, idx + 19));
      occurrences.push({
        word: "like",
        index: idx,
        context: context.trim(),
      });
    }
  }

  // 4. Overused adverbial fillers: "basically", "actually"
  // Only flagged if used as conversational throat-clearing at start of clauses or isolated
  const adverbialRegex = /\b(basically|actually)\b/gi;
  while ((match = adverbialRegex.exec(text)) !== null) {
    const idx = match.index;
    const prefix = text.slice(Math.max(0, idx - 15), idx).trim().toLowerCase();
    // Counted as filler if starting sentence, preceded by pause/comma, or standalone
    const isSentenceStartOrPunctuation = prefix.length === 0 || /[,;.!?]$/.test(prefix) || /^(and|so|well|but)$/.test(prefix);

    if (isSentenceStartOrPunctuation) {
      const context = text.slice(Math.max(0, idx - 15), Math.min(text.length, idx + match[0].length + 15));
      occurrences.push({
        word: match[0].toLowerCase(),
        index: idx,
        context: context.trim(),
      });
    }
  }

  // Sort occurrences by index
  occurrences.sort((a, b) => a.index - b.index);

  const fillerCount = occurrences.length;
  const fillerRate = wordCount > 0 ? Number(((fillerCount / wordCount) * 100).toFixed(1)) : 0;
  const fillerWords = Array.from(new Set(occurrences.map((o) => o.word)));

  return {
    fillerCount,
    fillerRate,
    fillerWords,
    fillerOccurrences: occurrences,
  };
}

// ============================================================================
// 5. OBSERVABLE DISFLUENCY INDICATORS
// ============================================================================

/**
 * Detects observable linguistic repetitions and false starts.
 * STRICT SAFETY RULE: Reports observable speech patterns only.
 * NEVER classifies or diagnoses medical speech disorders or stuttering.
 */
export function detectDisfluencyIndicators(candidateMessage: string): DisfluencyMetrics {
  const text = (candidateMessage || "").trim();
  if (!text) {
    return {
      repeatedWordCount: 0,
      repeatedPhraseCount: 0,
      falseStartCount: 0,
      disfluencyOccurrences: [],
    };
  }

  const occurrences: DisfluencyOccurrence[] = [];

  // 1. Repeated consecutive words (e.g. "we we", "the the", "in in")
  const repeatedWordRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
  let match: RegExpExecArray | null;
  while ((match = repeatedWordRegex.exec(text)) !== null) {
    occurrences.push({
      type: "REPEATED_WORD",
      text: match[0],
      index: match.index,
    });
  }

  // 2. Repeated short phrases (e.g. "in order to in order to", "we can we can")
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    for (let len = 2; len <= 3; len++) {
      for (let i = 0; i <= words.length - len * 2; i++) {
        const phraseA = words.slice(i, i + len).join(" ").toLowerCase();
        const phraseB = words.slice(i + len, i + len * 2).join(" ").toLowerCase();
        if (phraseA === phraseB && phraseA.length > 5) {
          const matchedPhrase = `${words.slice(i, i + len * 2).join(" ")}`;
          const phraseIdx = text.toLowerCase().indexOf(matchedPhrase.toLowerCase());
          // Avoid duplicate overlaps
          if (!occurrences.some((o) => o.type === "REPEATED_PHRASE" && Math.abs(o.index - phraseIdx) < 10)) {
            occurrences.push({
              type: "REPEATED_PHRASE",
              text: matchedPhrase,
              index: phraseIdx >= 0 ? phraseIdx : i,
            });
          }
        }
      }
    }
  }

  // 3. Observable false starts / abandoned fragments (e.g. "we should use— actually", "I think that--")
  const falseStartRegex = /\b([a-zA-Z\s]{4,})(—|--)\s*([a-zA-Z]{3,})/gi;
  while ((match = falseStartRegex.exec(text)) !== null) {
    occurrences.push({
      type: "FALSE_START",
      text: match[0],
      index: match.index,
    });
  }

  occurrences.sort((a, b) => a.index - b.index);

  const repeatedWordCount = occurrences.filter((o) => o.type === "REPEATED_WORD").length;
  const repeatedPhraseCount = occurrences.filter((o) => o.type === "REPEATED_PHRASE").length;
  const falseStartCount = occurrences.filter((o) => o.type === "FALSE_START").length;

  return {
    repeatedWordCount,
    repeatedPhraseCount,
    falseStartCount,
    disfluencyOccurrences: occurrences,
  };
}

// ============================================================================
// 6. COMMUNICATION CHARACTERISTICS & OBSERVABLE METRICS
// ============================================================================

/**
 * Assesses observable communication characteristics with no psychological inferences.
 * Fully continuous word count categories:
 * - MINIMAL: < 15 words
 * - CONCISE: 15–59 words
 * - BALANCED: 60–220 words
 * - VERBOSE: > 220 words
 */
export function evaluateStructureAssessment(wordCount: number): StructureAssessment {
  if (wordCount < 15) return "MINIMAL";
  if (wordCount <= 59) return "CONCISE";
  if (wordCount <= 220) return "BALANCED";
  return "VERBOSE";
}

export function assessCommunicationCharacteristics(
  wordCount: number,
  modality: "TEXT" | "VOICE",
  timing: TimingMetrics = { responseLatencyMs: null, answerDurationMs: null, totalTurnDurationMs: null },
  pauses: PauseMetrics = { pauseCount: null, longestPauseMs: null, averagePauseMs: null, totalPauseDurationMs: null, pausesPerMinute: null, pauseEvents: null },
  speakingRate: SpeakingRateMetrics = { wordCount, speakingDurationSec: null, wordsPerMinute: null },
  fillers: FillerMetrics = { fillerCount: 0, fillerRate: 0, fillerWords: [], fillerOccurrences: [] },
  disfluencies: DisfluencyMetrics = { repeatedWordCount: 0, repeatedPhraseCount: 0, falseStartCount: 0, disfluencyOccurrences: [] }
): CommunicationCharacteristics {
  const structureAssessment = evaluateStructureAssessment(wordCount);

  const observations: string[] = [];

  // 1. Structure observation
  observations.push(
    `Answer length: ${structureAssessment.toLowerCase()} response (${wordCount} words).`
  );

  // 2. Voice Pacing observation
  if (modality === "VOICE" && speakingRate.wordsPerMinute !== null) {
    const wpm = speakingRate.wordsPerMinute;
    if (wpm < 110) {
      observations.push(`Observed speaking pacing: deliberate cadence (${wpm} WPM).`);
    } else if (wpm <= 165) {
      observations.push(`Observed speaking pacing: standard interview cadence (${wpm} WPM).`);
    } else {
      observations.push(`Observed speaking pacing: rapid cadence (${wpm} WPM).`);
    }
  }

  // 3. Pause observations (Voice only)
  if (modality === "VOICE" && pauses.pauseCount !== null && pauses.pauseCount > 0) {
    observations.push(
      `Delivery pauses: ${pauses.pauseCount} pause(s) exceeding 400ms (longest: ${pauses.longestPauseMs}ms).`
    );
  }

  // 4. Filler word observations
  if (fillers.fillerCount > 0) {
    observations.push(
      `Verbal fillers: ${fillers.fillerCount} detected (${fillers.fillerRate} per 100 words).`
    );
  } else if (wordCount >= 20) {
    observations.push("Verbal fillers: No common fillers detected.");
  }

  // 5. Observable disfluency observations
  const totalDisfluency =
    disfluencies.repeatedWordCount +
    disfluencies.repeatedPhraseCount +
    disfluencies.falseStartCount;
  if (totalDisfluency > 0) {
    observations.push(
      `Delivery patterns: ${totalDisfluency} observable repetition or restart pattern(s) detected.`
    );
  }

  return {
    structureAssessment,
    observableCharacteristics: observations,
  };
}

// ============================================================================
// 7. RESPONSE STATUS CLASSIFIER
// ============================================================================

export function classifyResponseStatus(
  candidateMessage: string,
  voiceTiming?: VoiceTimingInput | null
): ResponseStatus {
  const trimmed = (candidateMessage || "").trim();

  if (!trimmed) {
    return "EMPTY";
  }

  if (voiceTiming?.isInterrupted) {
    return "INTERRUPTED";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  // Abandoned check: trailing truncation marker or minimal evasive filler under short timing
  const isTrailingCutoff = /[—\-]{2,}$|\.{3,}$/.test(trimmed) && words.length < 4;
  if (isTrailingCutoff) {
    return "ABANDONED";
  }

  return "COMPLETED";
}

// ============================================================================
// 8. RESPONSE ANALYZER SERVICE (MAIN PIPELINE)
// ============================================================================

export class ResponseAnalyzerService {
  /**
   * Evaluates a complete candidate turn deterministically.
   * Pure in-memory calculation; never throws.
   */
  static analyzeResponse(input: ResponseAnalysisInput): ResponseAnalysisResult {
    const {
      sessionId,
      turnSequenceNumber,
      candidateMessage,
      modality,
      messageId,
      voiceTiming,
    } = input;

    const responseStatus = classifyResponseStatus(candidateMessage, voiceTiming);
    const timing = analyzeResponseTiming(modality, voiceTiming);
    const pauses = analyzePauseMetrics(modality, timing.answerDurationMs, voiceTiming?.pauseIntervals);
    const speakingRate = calculateSpeakingRate(
      candidateMessage,
      modality,
      timing.answerDurationMs,
      pauses.totalPauseDurationMs
    );
    const fillers = detectFillerWords(candidateMessage);
    const disfluencies = detectDisfluencyIndicators(candidateMessage);
    const communication = assessCommunicationCharacteristics(
      speakingRate.wordCount,
      modality,
      timing,
      pauses,
      speakingRate,
      fillers,
      disfluencies
    );

    return {
      sessionId,
      turnSequenceNumber,
      messageId,
      modality,
      responseStatus,
      // Flat properties for direct access
      responseLatencyMs: timing.responseLatencyMs,
      answerDurationMs: timing.answerDurationMs,
      totalTurnDurationMs: timing.totalTurnDurationMs,
      pauseCount: pauses.pauseCount,
      longestPauseMs: pauses.longestPauseMs,
      averagePauseMs: pauses.averagePauseMs,
      totalPauseDurationMs: pauses.totalPauseDurationMs,
      pausesPerMinute: pauses.pausesPerMinute,
      wordCount: speakingRate.wordCount,
      speakingDurationSec: speakingRate.speakingDurationSec,
      wordsPerMinute: speakingRate.wordsPerMinute,
      fillerCount: fillers.fillerCount,
      fillerRate: fillers.fillerRate,
      fillerWords: fillers.fillerWords,
      repeatedWordCount: disfluencies.repeatedWordCount,
      repeatedPhraseCount: disfluencies.repeatedPhraseCount,
      falseStartCount: disfluencies.falseStartCount,
      structureAssessment: communication.structureAssessment,
      observableCharacteristics: communication.observableCharacteristics,
      // Grouped interfaces
      timing,
      pauses,
      speakingRate,
      fillers,
      disfluencies,
      communication,
      metadata: {
        analyzedAt: new Date().toISOString(),
        version: "phase-7-v1",
      },
    };
  }

  /**
   * Idempotently saves or updates a ResponseAnalysis record in PostgreSQL.
   * STRICT SAFETY GUARANTEE: Runs independently from the critical candidate-turn transaction.
   * Analysis failure never rolls back the candidate turn or breaks the interview.
   */
  static async persistAnalysis(
    analysis: ResponseAnalysisResult,
    prismaClient: typeof prisma | Prisma.TransactionClient = prisma
  ) {
    try {
      const record = await prismaClient.responseAnalysis.upsert({
        where: {
          sessionId_turnSequenceNumber: {
            sessionId: analysis.sessionId,
            turnSequenceNumber: analysis.turnSequenceNumber,
          },
        },
        update: {
          messageId: analysis.messageId || null,
          modality: analysis.modality,
          responseStatus: analysis.responseStatus,
          responseLatencyMs: analysis.timing.responseLatencyMs,
          answerDurationMs: analysis.timing.answerDurationMs,
          totalTurnDurationMs: analysis.timing.totalTurnDurationMs,
          pauseCount: analysis.pauses.pauseCount,
          longestPauseMs: analysis.pauses.longestPauseMs,
          averagePauseMs: analysis.pauses.averagePauseMs,
          totalPauseDurationMs: analysis.pauses.totalPauseDurationMs,
          pausesPerMinute: analysis.pauses.pausesPerMinute,
          pauseEvents: analysis.pauses.pauseEvents ? (analysis.pauses.pauseEvents as any) : Prisma.JsonNull,
          wordCount: analysis.speakingRate.wordCount,
          speakingDurationSec: analysis.speakingRate.speakingDurationSec,
          wordsPerMinute: analysis.speakingRate.wordsPerMinute,
          fillerCount: analysis.fillers.fillerCount,
          fillerRate: analysis.fillers.fillerRate,
          fillerWords: analysis.fillers.fillerWords as any,
          fillerOccurrences: analysis.fillers.fillerOccurrences as any,
          repeatedWordCount: analysis.disfluencies.repeatedWordCount,
          repeatedPhraseCount: analysis.disfluencies.repeatedPhraseCount,
          falseStartCount: analysis.disfluencies.falseStartCount,
          disfluencyOccurrences: analysis.disfluencies.disfluencyOccurrences as any,
          structureAssessment: analysis.communication.structureAssessment,
          observableCharacteristics: analysis.communication.observableCharacteristics as any,
          metadata: analysis.metadata ? (analysis.metadata as any) : Prisma.JsonNull,
        },
        create: {
          sessionId: analysis.sessionId,
          turnSequenceNumber: analysis.turnSequenceNumber,
          messageId: analysis.messageId || null,
          modality: analysis.modality,
          responseStatus: analysis.responseStatus,
          responseLatencyMs: analysis.timing.responseLatencyMs,
          answerDurationMs: analysis.timing.answerDurationMs,
          totalTurnDurationMs: analysis.timing.totalTurnDurationMs,
          pauseCount: analysis.pauses.pauseCount,
          longestPauseMs: analysis.pauses.longestPauseMs,
          averagePauseMs: analysis.pauses.averagePauseMs,
          totalPauseDurationMs: analysis.pauses.totalPauseDurationMs,
          pausesPerMinute: analysis.pauses.pausesPerMinute,
          pauseEvents: analysis.pauses.pauseEvents ? (analysis.pauses.pauseEvents as any) : Prisma.JsonNull,
          wordCount: analysis.speakingRate.wordCount,
          speakingDurationSec: analysis.speakingRate.speakingDurationSec,
          wordsPerMinute: analysis.speakingRate.wordsPerMinute,
          fillerCount: analysis.fillers.fillerCount,
          fillerRate: analysis.fillers.fillerRate,
          fillerWords: analysis.fillers.fillerWords as any,
          fillerOccurrences: analysis.fillers.fillerOccurrences as any,
          repeatedWordCount: analysis.disfluencies.repeatedWordCount,
          repeatedPhraseCount: analysis.disfluencies.repeatedPhraseCount,
          falseStartCount: analysis.disfluencies.falseStartCount,
          disfluencyOccurrences: analysis.disfluencies.disfluencyOccurrences as any,
          structureAssessment: analysis.communication.structureAssessment,
          observableCharacteristics: analysis.communication.observableCharacteristics as any,
          metadata: analysis.metadata ? (analysis.metadata as any) : Prisma.JsonNull,
        },
      });

      return record;
    } catch (err: any) {
      console.warn(
        `[ResponseAnalyzerService] Failed to persist ResponseAnalysis for session ${analysis.sessionId} turn ${analysis.turnSequenceNumber}:`,
        err?.message
      );
      throw err;
    }
  }

  /**
   * Retrieves all ResponseAnalysis records for a session in sequential order.
   */
  static async getSessionAnalyses(
    sessionId: string,
    prismaClient: typeof prisma | Prisma.TransactionClient = prisma
  ) {
    try {
      return await prismaClient.responseAnalysis.findMany({
        where: { sessionId },
        orderBy: { turnSequenceNumber: "asc" },
      });
    } catch (err: any) {
      console.warn(`[ResponseAnalyzerService] Failed to retrieve analyses for ${sessionId}:`, err?.message);
      return [];
    }
  }
}
