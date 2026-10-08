import { prisma } from "@/lib/prisma";
import { InterviewType } from "@prisma/client";

// ============================================================================
// PHASE 6: QUESTION DIVERSITY & ANTI-REPETITION TYPES
// ============================================================================

export type ScenarioArchetype =
  | "SYSTEM_DESIGN_SCRATCH"
  | "BOTTLENECK_FAILURE"
  | "TRADEOFF_EVALUATION"
  | "SCALE_CONCURRENCY"
  | "MIGRATION_REFACTOR"
  | "PRACTICE_PROCESS"
  | "BEHAVIORAL_SCENARIO";

export interface QuestionSignature {
  rawText: string;
  normalizedText: string;
  tokens: string[];
  coreEntities: string[];
  archetype: ScenarioArchetype;
}

export interface SimilarityOptions {
  precedingCandidateAnswer?: string;
  isFollowUpAction?: boolean;
  targetPillarIndex?: number;
}

export interface SimilarityResult {
  isDuplicate: boolean;
  similarityScore: number;
  matchedLevel: "LEVEL_1_EXACT" | "LEVEL_2_LEXICAL" | "LEVEL_3_CONCEPT_SCENARIO" | "NONE";
  reason: string;
  isExemptedFollowUp?: boolean;
}

export interface QuestionValidationResult {
  isValid: boolean;
  collidedQuestion?: string;
  matchLevel?: string;
  reason?: string;
  suggestedAlternativeArchetype?: ScenarioArchetype;
}

// Common stopwords to exclude from content token comparison
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at", "by",
  "for", "with", "about", "against", "between", "into", "through", "during", "before",
  "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off",
  "over", "under", "again", "further", "then", "once", "here", "there", "all", "any",
  "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
  "only", "own", "same", "so", "than", "too", "very", "can", "will", "just", "should",
  "now", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "having", "do", "does", "did", "doing", "would", "could", "you", "your", "we", "our",
  "i", "my", "me", "he", "she", "it", "they", "them", "what", "which", "who", "whom",
  "this", "that", "these", "those", "am"
]);

// Known conversational openers & persona prefixes to strip during question normalization
const CONVERSATIONAL_PREFIXES = [
  // Persona prefixes
  /^(alex chen|sarah martinez|jordan williams|maya patel)\s*:\s*/i,
  // Conversational acknowledgments
  /^(fair point( on that)?|right|got it|makes sense|okay|hm|nice approach|good thinking|thanks for sharing)[.,!?;:\s]+/i,
  /^(let'?s unpack that|let'?s look at that|let'?s talk about|let'?s dive into)[.,!?;:\s]+/i,
  // Generic question phrasing
  /^(could you (please )?explain|can you (please )?explain|explain( to me)? how you( would)?|explain)/i,
  /^(walk me through how you( would)?|walk me through your|walk me through)/i,
  /^(tell me about how you( would)?|tell me about a time|tell me about your|tell me about)/i,
  /^(how would you (approach |design |architect |implement |build )?(a |an |the )?)/i,
  /^(how do you (approach |handle |design |architect |implement |build )?(a |an |the )?)/i,
  /^(what is your (approach|strategy|design) (for|to))/i,
  /^(what'?s your (approach|strategy|design) (for|to))/i,
  /^(in your experience,? how do you)/i,
  /^(suppose you (need to|have to|are asked to))/i,
  /^(imagine you (need to|have to|are asked to))/i,
  /^(design (a |an |the )?)/i,
  /^(build (a |an |the )?)/i,
];

// Technical subject entities recognized for collision detection
const KNOWN_TECHNICAL_ENTITIES = [
  "url shortening", "url shortener", "tinyurl", "bitly",
  "notification service", "notification system", "push notification",
  "rate limiter", "rate limiting", "token bucket", "leaky bucket",
  "caching layer", "cache invalidation", "redis cluster", "memcached", "redis", "caching",
  "chat application", "messaging service", "whatsapp", "slack",
  "database indexing", "btree index", "b-tree", "hash index",
  "database sharding", "horizontal partitioning", "consistent hashing",
  "event streaming", "kafka topic", "kafka partition", "rabbitmq", "kafka",
  "distributed lock", "redlock", "zookeeper", "consensus",
  "connection pool", "connection pooling", "pgbouncer", "postgres", "postgresql",
  "circuit breaker", "resilience4j", "hystrix",
  "file storage", "s3", "blob storage", "cdn",
  "search engine", "elasticsearch", "full text search",
  "load balancer", "reverse proxy", "nginx", "envoy",
  "authentication", "oauth2", "jwt", "session management",
  "payment gateway", "idempotency key", "two phase commit", "saga pattern",
  "web crawler", "distributed crawler", "frontier",
  "recommendation engine", "collaborative filtering",
  "leader election", "raft", "paxos", "docker", "kubernetes"
];

// ============================================================================
// NORMALIZATION & SIGNATURE EXTRACTION
// ============================================================================

/**
 * Normalizes question text by stripping conversational prefixes, punctuation,
 * trivial formatting, and generic question starters.
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return "";

  let cleaned = text.trim();

  // 1. Remove [SESSION_COMPLETED] token if present
  cleaned = cleaned.replace(/\[SESSION_COMPLETED\]/g, "").trim();

  // 2. Strip persona & conversational prefixes iteratively
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of CONVERSATIONAL_PREFIXES) {
      if (prefix.test(cleaned)) {
        cleaned = cleaned.replace(prefix, "").trim();
        changed = true;
      }
    }
  }

  // 3. Lowercase & strip punctuation (preserve spaces and alphanumeric)
  cleaned = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

/**
 * Classifies the scenario archetype of a question.
 */
export function classifyScenarioArchetype(text: string): ScenarioArchetype {
  const lower = text.toLowerCase();

  if (
    /\b(bottleneck|slow|down|crash|failed|failure|incident|degrade|deadlock|timeout|spike|oom|out of memory|cascade|corrupt|recovering from)\b/.test(
      lower
    )
  ) {
    return "BOTTLENECK_FAILURE";
  }

  if (
    /\b(tradeoff|trade-off|versus|vs|compare|why would you choose|pros and cons|alternative to|instead of)\b/.test(
      lower
    )
  ) {
    return "TRADEOFF_EVALUATION";
  }

  if (
    /\b(scale|scaling|100k|million|millions|qps|high throughput|massive|surging|burst|partitioning|sharded|concurrency|concurrent)\b/.test(
      lower
    )
  ) {
    return "SCALE_CONCURRENCY";
  }

  if (
    /\b(legacy|inherit|monolith|monolithic|refactor|migration|migrating|transition from|replace old)\b/.test(
      lower
    )
  ) {
    return "MIGRATION_REFACTOR";
  }

  if (
    /\b(conflict|stakeholder|disagree|deadline|pushback|feedback|mentor|motivat|team dynamics|culture)\b/.test(
      lower
    )
  ) {
    return "BEHAVIORAL_SCENARIO";
  }

  if (
    /\b(process|ci\/cd|deploy|pipeline|onboarding|code review|postmortem|retrospective|standards)\b/.test(
      lower
    )
  ) {
    return "PRACTICE_PROCESS";
  }

  return "SYSTEM_DESIGN_SCRATCH";
}

/**
 * Extracts technical entities mentioned in a question.
 */
export function extractTechnicalEntities(text: string): string[] {
  const lower = text.toLowerCase();
  const matched = new Set<string>();

  for (const entity of KNOWN_TECHNICAL_ENTITIES) {
    if (lower.includes(entity)) {
      matched.add(entity);
    }
  }

  return Array.from(matched);
}

/**
 * Extracts a complete signature from question text.
 */
export function extractQuestionSignature(text: string): QuestionSignature {
  const normalizedText = normalizeQuestionText(text);
  const rawTokens = normalizedText.split(/\s+/).filter(Boolean);
  const tokens = rawTokens.filter((t) => !STOPWORDS.has(t) && t.length > 2);
  const coreEntities = extractTechnicalEntities(text);
  const archetype = classifyScenarioArchetype(text);

  return {
    rawText: text,
    normalizedText,
    tokens,
    coreEntities,
    archetype,
  };
}

// ============================================================================
// SIMILARITY EVALUATION (LEVEL 1, LEVEL 2, LEVEL 3)
// ============================================================================

/**
 * Calculates Jaccard similarity between two token arrays.
 */
function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  setA.forEach((t) => {
    if (setB.has(t)) intersection++;
  });

  const union = new Set(tokensA.concat(tokensB)).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculates Dice coefficient on word 2-grams.
 */
function calculateBigramSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length < 2 || tokensB.length < 2) {
    return calculateJaccardSimilarity(tokensA, tokensB);
  }

  const getBigrams = (arr: string[]) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < arr.length - 1; i++) {
      bigrams.add(`${arr[i]}_${arr[i + 1]}`);
    }
    return bigrams;
  };

  const bigramsA = getBigrams(tokensA);
  const bigramsB = getBigrams(tokensB);

  let match = 0;
  bigramsA.forEach((bg) => {
    if (bigramsB.has(bg)) match++;
  });

  const total = bigramsA.size + bigramsB.size;
  return total === 0 ? 0 : (2 * match) / total;
}

/**
 * Checks if a proposed question is an exempted legitimate contextual follow-up.
 * Narrow exemption rule:
 * - Preceding candidate message must explicitly introduce or contain the anchor subject.
 * - Current action must be a follow-up action (DRILL_DOWN or CHALLENGE_TRADEOFF).
 * - Proposed question must introduce a deeper drill-down or constraint.
 */
function isExemptedContextualFollowUp(
  proposedSig: QuestionSignature,
  existingSig: QuestionSignature,
  options?: SimilarityOptions
): boolean {
  if (!options?.isFollowUpAction || !options.precedingCandidateAnswer) {
    return false;
  }

  const candidateAnswerLower = options.precedingCandidateAnswer.toLowerCase();

  // Check if candidate explicitly introduced an entity that the proposed question targets
  const sharedWithCandidate = proposedSig.coreEntities.some((entity) =>
    candidateAnswerLower.includes(entity)
  );

  // If candidate introduced the technology/concept and proposed question is drilling down into it
  if (sharedWithCandidate) {
    // Ensure proposed question isn't just an exact clone of a past question
    if (proposedSig.normalizedText === existingSig.normalizedText) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Evaluates similarity between a proposed question and an existing question
 * using the three approved tiers:
 * - Level 1: Exact normalized match
 * - Level 2: Lexical similarity / Jaccard & Bigram overlap
 * - Level 3: Deterministic concept + scenario-archetype collision heuristics
 */
export function evaluateQuestionSimilarity(
  proposedQuestion: string,
  existingQuestion: string,
  options?: SimilarityOptions
): SimilarityResult {
  const proposedSig = extractQuestionSignature(proposedQuestion);
  const existingSig = extractQuestionSignature(existingQuestion);

  // If both empty, cannot collide
  if (!proposedSig.normalizedText || !existingSig.normalizedText) {
    return {
      isDuplicate: false,
      similarityScore: 0,
      matchedLevel: "NONE",
      reason: "Empty question text",
    };
  }

  // Check for legitimate contextual follow-up exemption
  if (isExemptedContextualFollowUp(proposedSig, existingSig, options)) {
    return {
      isDuplicate: false,
      similarityScore: 0.2,
      matchedLevel: "NONE",
      reason: "Legitimate contextual follow-up derived directly from candidate answer",
      isExemptedFollowUp: true,
    };
  }

  // --------------------------------------------------------------------------
  // LEVEL 1: Exact Normalized Match
  // --------------------------------------------------------------------------
  if (proposedSig.normalizedText === existingSig.normalizedText) {
    return {
      isDuplicate: true,
      similarityScore: 1.0,
      matchedLevel: "LEVEL_1_EXACT",
      reason: "Exact normalized question match (case, punctuation, and filler variance stripped)",
    };
  }

  // --------------------------------------------------------------------------
  // LEVEL 2: Lexical Similarity (Jaccard & Bigram overlap)
  // --------------------------------------------------------------------------
  const jaccard = calculateJaccardSimilarity(proposedSig.tokens, existingSig.tokens);
  const bigramScore = calculateBigramSimilarity(proposedSig.tokens, existingSig.tokens);
  const lexicalScore = Math.max(jaccard, bigramScore);

  if (lexicalScore >= 0.70) {
    return {
      isDuplicate: true,
      similarityScore: Number(lexicalScore.toFixed(3)),
      matchedLevel: "LEVEL_2_LEXICAL",
      reason: `High lexical overlap with previously asked question (${(lexicalScore * 100).toFixed(1)}% token similarity)`,
    };
  }

  // --------------------------------------------------------------------------
  // LEVEL 3: Deterministic Concept + Scenario-Archetype Collision Heuristics
  // --------------------------------------------------------------------------
  const sharedEntities = proposedSig.coreEntities.filter((e) =>
    existingSig.coreEntities.includes(e)
  );

  if (sharedEntities.length > 0) {
    // Both questions test the same primary subject/tool
    const sameArchetype = proposedSig.archetype === existingSig.archetype;

    if (sameArchetype) {
      // Example: Both questions are greenfield SYSTEM_DESIGN_SCRATCH for "url shortening"
      const combinedScore = Math.max(0.65, lexicalScore);
      return {
        isDuplicate: true,
        similarityScore: Number(combinedScore.toFixed(3)),
        matchedLevel: "LEVEL_3_CONCEPT_SCENARIO",
        reason: `Deterministic collision: same core concept ('${sharedEntities.join(
          ", "
        )}') tested under the same scenario archetype (${proposedSig.archetype})`,
      };
    } else {
      // Different archetypes (e.g. greenfield scratch vs bottleneck failure): distinct scenarios!
      return {
        isDuplicate: false,
        similarityScore: Number(lexicalScore.toFixed(3)),
        matchedLevel: "NONE",
        reason: `Shared concept '${sharedEntities.join(
          ", "
        )}' but different scenario angle (${proposedSig.archetype} vs ${existingSig.archetype})`,
      };
    }
  }

  return {
    isDuplicate: false,
    similarityScore: Number(lexicalScore.toFixed(3)),
    matchedLevel: "NONE",
    reason: "Distinct question with unique concepts and scenario angle",
  };
}

// ============================================================================
// HARD VALIDATION & ALTERNATIVE SUGGESTION
// ============================================================================

const ALTERNATIVE_ARCHETYPES: ScenarioArchetype[] = [
  "BOTTLENECK_FAILURE",
  "TRADEOFF_EVALUATION",
  "SCALE_CONCURRENCY",
  "MIGRATION_REFACTOR",
  "SYSTEM_DESIGN_SCRATCH",
];

/**
 * Validates a candidate question against a list of previously asked questions.
 * Returns isValid = false if ANY duplicate/collision is detected.
 */
export function validateCandidateQuestion(
  proposedQuestion: string,
  history: Array<{ questionText: string; normalizedText?: string }>,
  options?: SimilarityOptions
): QuestionValidationResult {
  if (!proposedQuestion || !proposedQuestion.trim()) {
    return {
      isValid: false,
      reason: "Proposed question is empty",
    };
  }

  for (const item of history) {
    const sim = evaluateQuestionSimilarity(proposedQuestion, item.questionText, options);
    if (sim.isDuplicate) {
      const proposedSig = extractQuestionSignature(proposedQuestion);
      // Pick a different archetype than the one that collided
      const altArchetype =
        ALTERNATIVE_ARCHETYPES.find((a) => a !== proposedSig.archetype) ||
        "BOTTLENECK_FAILURE";

      return {
        isValid: false,
        collidedQuestion: item.questionText,
        matchLevel: sim.matchedLevel,
        reason: sim.reason,
        suggestedAlternativeArchetype: altArchetype,
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// SCENARIO DIVERSIFICATION GUIDELINES FOR PROMPTS
// ============================================================================

/**
 * Returns specific scenario variation angles for prompt injection.
 */
export function getScenarioDiversificationGuidelines(
  pillarIndex: number,
  pillarName?: string,
  domain?: string | null,
  difficulty?: string
): string {
  const diff = (difficulty || "MID").toUpperCase();

  const guidelinesByPillar: Record<number, string[]> = {
    0: [
      "Variation Angle 1 (Production Incident): A legacy service is dropping requests under 10x traffic surge. Diagnose the boundary bottleneck.",
      "Variation Angle 2 (Tradeoff Decision): Defend choosing asynchronous event-driven queues over synchronous gRPC for inter-service communication.",
      "Variation Angle 3 (Multi-tenant Isolation): Partitioning system boundaries to guarantee SLA isolation between high-volume and regular tenants.",
    ],
    1: [
      "Variation Angle 1 (Query Degeneration): A write-heavy table with 50M rows experiences sudden read latency degradation. Diagnose index bloat.",
      "Variation Angle 2 (Data Migration): Zero-downtime schema migration from a single monolithic SQL table to a sharded cluster.",
      "Variation Angle 3 (Consistency Tradeoff): Resolving cross-shard transactions when strict ACID guarantees compete with latency requirements.",
    ],
    2: [
      "Variation Angle 1 (Cache Stampede): Cache invalidation triggers simultaneous cache-miss floods (thundering herd) against origin database.",
      "Variation Angle 2 (Hot Partition): Unevenly distributed keys cause single-node memory saturation in a distributed cache.",
      "Variation Angle 3 (Concurrency Locking): Managing optimistic vs pessimistic concurrency control during high-frequency ticket booking.",
    ],
    3: [
      "Variation Angle 1 (Cascading Dependency Crash): A downstream 3rd-party webhook provider fails. How do circuit breakers prevent local pool starvation?",
      "Variation Angle 2 (Split-Brain Recovery): Network partition splits cluster. How does state reconciliation resolve split writes?",
      "Variation Angle 3 (Poison Pill Message): Dead-letter queue handling when corrupted event payloads crash consumer pods repeatedly.",
    ],
    4: [
      "Variation Angle 1 (Distributed Telemetry): Correlating trace IDs across 5 microservices when latency suddenly jumps at the 99th percentile.",
      "Variation Angle 2 (Canary Failure Rollback): Automated health checks trigger rollback when error rate exceeds 0.5% during zero-downtime deployment.",
      "Variation Angle 3 (Token Invalidation): Instant global revocation of compromised JWT tokens across a distributed stateless fleet.",
    ],
  };

  const pillarAngles = guidelinesByPillar[pillarIndex] || guidelinesByPillar[0];

  return `
SCENARIO DIVERSIFICATION DIRECTIVE (DO NOT REUSE STANDARD TEXTBOOK QUESTIONS):
To guarantee question diversity across candidate sessions, explore an alternative concrete scenario angle:
• ${pillarAngles.join("\n• ")}
- Ensure the question tests ${pillarName || "the active pillar"} under ${diff} expectations with concrete constraints.
`.trim();
}

// ============================================================================
// SAFE DETERMINISTIC FALLBACK QUESTION POOL
// ============================================================================

export function getDiverseFallbackQuestion(
  pillarIndex: number,
  pillarName?: string,
  domain?: string | null,
  archetype?: ScenarioArchetype
): string {
  const fallbacksByPillar: Record<number, string[]> = {
    0: [
      "Let's look at a system reliability scenario: Suppose a distributed telemetry agent begins losing events during intermittent network partitions. How would you design its local buffering and backpressure mechanisms?",
      "Consider an event-driven notification hub: What architectural tradeoffs would lead you to choose an append-only log model over a traditional message broker queue?",
      "Suppose you are designing a multi-tenant API gateway where a single rogue tenant floods the cluster with bursty requests. How do you isolate resources to protect tenant SLAs?",
    ],
    1: [
      "In a high-throughput relational database with over 100 million rows, query latency suddenly degrades at the 99th percentile due to index bloat. How would you diagnose and resolve this without taking the table offline?",
      "Suppose you need to execute a zero-downtime database migration from a monolithic schema to a sharded partition key. Walk me through your migration and validation strategy.",
      "How would you handle cross-shard distributed transactions when you need atomicity across two separate database clusters?",
    ],
    2: [
      "Consider a high-traffic cache cluster: How would you prevent a cache stampede (thundering herd) when a popular key expires while receiving 50,000 requests per second?",
      "Suppose a distributed cache experiences severe hot-key memory saturation on a single node. What partition or replication strategies would you implement to distribute the load?",
      "In a high-concurrency ticket reservation system, how would you balance optimistic locking against pessimistic locking under extreme contention?",
    ],
    3: [
      "Suppose a downstream third-party payment partner starts hanging with 30-second response delays. How do you configure circuit breakers and thread pool isolation to prevent cascading failures across your upstream services?",
      "In an asynchronous worker pipeline, consumer pods begin crashing continuously on a poisoned event payload. How do you design your dead-letter queue and retry backoff strategy?",
      "During a network partition, how does your distributed service handle split-brain state reconciliation once connectivity is restored?",
    ],
    4: [
      "During a canary release of a microservice, telemetry shows the error rate ticking up by 1.2% exclusively for European users. Walk me through how you isolate the root cause and execute an automated rollback.",
      "In a distributed microservices fleet, how do you correlate distributed trace spans across asynchronous message boundaries to pinpoint 99th-percentile latency spikes?",
      "Suppose an API token is compromised. How do you ensure instantaneous global token invalidation across a stateless fleet running behind regional edge CDNs?",
    ],
  };

  const pool = fallbacksByPillar[pillarIndex] || fallbacksByPillar[0];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

// ============================================================================
// PERSISTENT QUESTION HISTORY SERVICE
// ============================================================================

export class QuestionDiversityService {
  /**
   * Retrieves previously asked questions for a user across previous interview sessions.
   */
  static async getCrossSessionHistory(
    userId: string,
    track: InterviewType | string,
    domain?: string | null,
    limit = 25
  ): Promise<Array<{ questionText: string; normalizedText: string; pillarSlug: string | null }>> {
    try {
      const records = await prisma.questionHistory.findMany({
        where: {
          userId,
          track: track as string,
          ...(domain ? { domain } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          questionText: true,
          normalizedText: true,
          pillarSlug: true,
        },
      });

      return records;
    } catch (err) {
      console.warn("[QuestionDiversityService] Could not retrieve cross-session history:", err);
      return [];
    }
  }

  /**
   * Atomically records a successfully committed question into QuestionHistory.
   * STRICT SAFETY GUARANTEE: Called ONLY after the assistant turn message is committed to DB.
   */
  static async recordQuestion(params: {
    userId: string;
    sessionId: string;
    questionText: string;
    pillarIndex?: number;
    pillarSlug?: string;
    pillarName?: string;
    track: string;
    domain?: string | null;
    difficulty?: string | null;
    questionType?: string;
  }): Promise<boolean> {
    const { questionText } = params;
    if (!questionText || !questionText.trim()) return false;

    // Do not record concluding thank-you / session-end messages as interview questions
    if (questionText.includes("[SESSION_COMPLETED]")) return false;

    const normalizedText = normalizeQuestionText(questionText);
    const signature = extractQuestionSignature(questionText);

    try {
      await prisma.questionHistory.create({
        data: {
          userId: params.userId,
          sessionId: params.sessionId,
          questionText: questionText.trim(),
          normalizedText,
          pillarIndex: params.pillarIndex ?? 0,
          pillarSlug: params.pillarSlug ?? "PILLAR-0",
          pillarName: params.pillarName ?? "General",
          track: params.track,
          domain: params.domain || null,
          difficulty: params.difficulty || "MID",
          questionType: params.questionType || (params.pillarIndex === 0 ? "SCENARIO" : "DRILL_DOWN"),
          keyConcepts: signature.coreEntities,
        },
      });
      return true;
    } catch (err: any) {
      console.warn("[QuestionDiversityService] Failed to record QuestionHistory record:", err?.message);
      return false;
    }
  }

  /**
   * Records assigned aptitude questions into QuestionHistory so they are tracked across sessions.
   */
  static async recordAptitudeQuestions(
    userId: string,
    sessionId: string,
    questions: Array<{ id: string; question: string; category?: string }>
  ): Promise<boolean> {
    try {
      await prisma.$transaction(
        questions.map((q) =>
          prisma.questionHistory.create({
            data: {
              userId,
              sessionId,
              questionText: q.question,
              normalizedText: normalizeQuestionText(q.question),
              pillarIndex: 0,
              pillarSlug: "APTITUDE",
              pillarName: q.category || "Aptitude",
              track: "APTITUDE",
              questionType: "APTITUDE",
              keyConcepts: [q.id],
            },
          })
        )
      );
      return true;
    } catch (err: any) {
      console.warn("[QuestionDiversityService] Failed to record aptitude question history:", err?.message);
      return false;
    }
  }

  /**
   * Retrieves all aptitude question IDs previously assigned to a candidate.
   */
  static async getAptitudeExclusionIds(userId: string): Promise<string[]> {
    try {
      const records = await prisma.questionHistory.findMany({
        where: { userId, track: "APTITUDE" },
        select: { keyConcepts: true },
      });
      const ids = new Set<string>();
      records.forEach((r) => {
        if (Array.isArray(r.keyConcepts)) {
          r.keyConcepts.forEach((concept) => {
            if (typeof concept === "string") ids.add(concept);
          });
        }
      });
      return Array.from(ids);
    } catch (err) {
      console.warn("[QuestionDiversityService] Could not retrieve aptitude exclusion IDs:", err);
      return [];
    }
  }
}

