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
  /^(alex chen|sarah martinez|jordan williams|maya patel|david sterling|rachel green|dr\.?\s*elena rostova|elena rostova|marcus vance|vikram malhotra)\s*:\s*/i,
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
 * Returns specific scenario variation angles for prompt injection tailored to domain and pillar.
 */
export function getScenarioDiversificationGuidelines(
  pillarIndex: number,
  pillarName?: string,
  domain?: string | null,
  difficulty?: string
): string {
  const diff = (difficulty || "MID").toUpperCase();
  const normDomain = (domain || "").toLowerCase().trim();

  // 1. FINANCE DOMAIN GUIDELINES
  if (normDomain.includes("finance")) {
    const financeGuidelines: Record<number, string[]> = {
      0: [
        "Variation Angle 1 (WACC & Sensitivity): The Federal Reserve hikes benchmark rates by 100 bps. How does this impact debt vs equity cost in WACC and the resulting DCF valuation?",
        "Variation Angle 2 (Multiple Divergence): A target firm trades at 18x EV/EBITDA while peers trade at 12x. Walk me through the operational, growth, or margin factors that could justify or invalidate this premium.",
        "Variation Angle 3 (LBO Returns): In a leveraged buyout, how do senior debt covenants and mezzanine financing tranches affect the sponsor's target 20% IRR?",
      ],
      1: [
        "Variation Angle 1 (Working Capital Crunch): Revenue is up 30% YoY, but operating cash flow is deeply negative. Diagnose the cash conversion cycle and receivables aging.",
        "Variation Angle 2 (Capitalized vs Expensed R&D): Trace how capitalizing $20M of software development instead of expensing it affects EBITDA, net income, and operating cash flows across periods.",
        "Variation Angle 3 (Inventory Valuation): Explain the cash flow and tax implications of shifting from FIFO to LIFO in an inflationary environment.",
      ],
      2: [
        "Variation Angle 1 (Optimal Debt Ratio): A firm's debt-to-equity is 0.2. Why might management issue $500M in senior notes to repurchase shares despite rising borrowing costs?",
        "Variation Angle 2 (Debt Covenant Breach): EBITDA drops 15%, causing the net debt to EBITDA ratio to touch a 4.0x covenant ceiling. What strategic financing actions should the CFO take?",
        "Variation Angle 3 (Dividend vs Buyback): Evaluate the tax, signaling, and balance sheet implications of returning $100M of excess cash via share buybacks versus a special dividend.",
      ],
      3: [
        "Variation Angle 1 (FX Hedging): A multinational has 40% of costs in USD and 60% of revenue in EUR. How would you structure a hedging program using forward contracts and options?",
        "Variation Angle 2 (Value at Risk): Interpret a daily 99% VaR of $5M on a $200M portfolio, and discuss its limitations during tail-risk events.",
        "Variation Angle 3 (Interest Rate Swaps): How does a borrower convert $100M of floating SOFR debt into fixed-rate obligations using an interest rate swap?",
      ],
      4: [
        "Variation Angle 1 (Accretion/Dilution): Target has a P/E of 20, Acquirer has a P/E of 15. Is an all-stock deal accretive or dilutive to the acquirer's EPS before synergies?",
        "Variation Angle 2 (Synergy Valuation): In an acquisition, how do you haircut cost synergies versus revenue synergies when modeling pro-forma enterprise value?",
        "Variation Angle 3 (Due Diligence Red Flags): Uncovering off-balance sheet liabilities and customer concentration risks during financial due diligence.",
      ],
    };
    const angles = financeGuidelines[pillarIndex] || financeGuidelines[0];
    return `
SCENARIO DIVERSIFICATION DIRECTIVE (STRICT FINANCE DOMAIN FOCUS):
To guarantee deep financial assessment across candidate sessions, explore an alternative concrete financial scenario angle:
â€¢ ${angles.join("\nâ€¢ ")}
- Ensure the question tests ${pillarName || "the active financial pillar"} under ${diff} expectations with concrete numbers, valuation tradeoffs, or financial statements mechanics.
- STRICT RULE: NEVER ask software architecture, coding, or database questions. Keep the focus entirely on finance.
`.trim();
  }

  // 2. ACCOUNTING DOMAIN GUIDELINES
  if (normDomain.includes("account")) {
    const accountingGuidelines: Record<number, string[]> = {
      0: [
        "Variation Angle 1 (ASC 606 Revenue Recognition): How would you account for a 3-year enterprise software contract with bundled implementation, custom modifications, and support?",
        "Variation Angle 2 (Lease Accounting ASC 842): Walk through the balance sheet impact of recording an operating lease as a Right-of-Use (ROU) asset and lease liability.",
        "Variation Angle 3 (Fair Value Leveling): Classifying investments between Level 1, Level 2, and Level 3 fair value hierarchies during fiscal year-end reporting.",
      ],
      1: [
        "Variation Angle 1 (Unreconciled Clearing Accounts): A high-volume payment clearing account has a $1.2M unexplained variance at month-end close. What audit and reconciliation steps do you take?",
        "Variation Angle 2 (Complex Accruals): Accruing for unbilled vendor services and contingent liabilities under GAAP conservatism principles.",
        "Variation Angle 3 (Intercompany Eliminations): Consolidating a foreign subsidiary with currency translation adjustments and intercompany loan eliminations.",
      ],
      2: [
        "Variation Angle 1 (Bad Debt Allowance): Estimating credit loss reserves under the CECL (Current Expected Credit Losses) standard during macroeconomic downturns.",
        "Variation Angle 2 (Inventory Lower of Cost or Market): Testing for inventory obsolescence and recording write-downs under FIFO vs. weighted average cost.",
        "Variation Angle 3 (Capitalized Software vs Expense): Applying criteria to determine when internal-use software development costs must be capitalized vs. expensed.",
      ],
      3: [
        "Variation Angle 1 (SOX 404 Deficiency): An internal audit reveals the same individual can create new vendors and approve invoice disbursements. Design a remediation control.",
        "Variation Angle 2 (Substantive Testing): Designing analytical procedures and sample testing for audit verification of year-end deferred revenue balances.",
        "Variation Angle 3 (Fraud Detection): Identifying red flags in manual journal entries posted near the close of a fiscal quarter.",
      ],
      4: [
        "Variation Angle 1 (Deferred Tax Asset Valuation Allowance): Determining whether a full valuation allowance is required against deferred tax assets after consecutive operating losses.",
        "Variation Angle 2 (Book vs Tax Timing Differences): Explaining temporary vs. permanent differences created by accelerated tax depreciation (MACRS) vs. book straight-line.",
        "Variation Angle 3 (R&D Tax Amortization): Navigating Section 174 mandatory capitalization and 5-year amortization for domestic research expenditures.",
      ],
    };
    const angles = accountingGuidelines[pillarIndex] || accountingGuidelines[0];
    return `
SCENARIO DIVERSIFICATION DIRECTIVE (STRICT ACCOUNTING DOMAIN FOCUS):
To guarantee rigorous accounting assessment, explore an alternative concrete accounting scenario:
â€¢ ${angles.join("\nâ€¢ ")}
- Ensure the question tests ${pillarName || "the active accounting pillar"} under ${diff} expectations with concrete GAAP/IFRS standards, journal entries, or balance sheet treatments.
- STRICT RULE: NEVER ask software architecture, coding, or IT questions. Keep the focus entirely on accounting.
`.trim();
  }

  // 3. DATA SCIENCE DOMAIN GUIDELINES
  if (normDomain.includes("data_science") || normDomain.includes("data science")) {
    const dsGuidelines: Record<number, string[]> = {
      0: [
        "Variation Angle 1 (Hypothesis Testing & Power): Designing an A/B test with small sample sizes where statistical power and type I/II error tradeoffs are critical.",
        "Variation Angle 2 (Extreme Class Imbalance): Formulating sampling and loss weight strategies when positive fraud signals occur in fewer than 0.05% of rows.",
        "Variation Angle 3 (Distributional Shifts): Identifying non-Gaussian tails and applying appropriate parametric vs non-parametric hypothesis tests.",
      ],
      1: [
        "Variation Angle 1 (Target Leakage): Preventing subtle data leakage when generating windowed aggregations and target encodings across cross-validation folds.",
        "Variation Angle 2 (High-Cardinality Categoricals): Comparing frequency encoding, weight of evidence (WoE), and entity embeddings for 100k+ categorical levels.",
        "Variation Angle 3 (Dimensionality Reduction): Choosing between PCA, UMAP, and autoencoders for dense representation learning.",
      ],
      2: [
        "Variation Angle 1 (Model Selection Tradeoff): Defending a constrained regularized GLM versus an ensemble gradient-boosted tree in a latency-critical pipeline.",
        "Variation Angle 2 (Tree Depth vs Learning Rate): Tuning XGBoost / LightGBM hyperparameters to prevent leaf overfitting on noisy tabular data.",
        "Variation Angle 3 (Neural Network Architecture): Formulating regularization and dropout schedules when fine-tuning deep models on small datasets.",
      ],
      3: [
        "Variation Angle 1 (Metric Selection): Demonstrating why ROC-AUC is dangerously misleading on skewed datasets and choosing Precision-Recall AUC (PR-AUC).",
        "Variation Angle 2 (Cross-Validation Strategy): Designing GroupKFold and Purged Time-Series splits to prevent temporal leakage in financial forecasting.",
        "Variation Angle 3 (Bias-Variance Diagnostics): Diagnosing learning curves to distinguish underfitting from high estimation variance.",
      ],
      4: [
        "Variation Angle 1 (Concept Drift): Distinguishing covariate shift from concept drift in production and formulating automated retraining policies.",
        "Variation Angle 2 (Explainability with SHAP): Explaining tree SHAP versus kernel SHAP calculations for high-stakes credit approval models.",
        "Variation Angle 3 (Real-Time Inference Serving): Managing model feature store freshness and p99 inference latency constraints.",
      ],
    };
    const angles = dsGuidelines[pillarIndex] || dsGuidelines[0];
    return `
SCENARIO DIVERSIFICATION DIRECTIVE (STRICT DATA SCIENCE DOMAIN FOCUS):
To guarantee deep data science assessment, explore an alternative concrete machine learning scenario:
- ${angles.join("\n- ")}
- Ensure the question tests ${pillarName || "the active data science pillar"} under ${diff} expectations with statistical rigor, evaluation metrics, or modeling trade-offs.
- STRICT RULE: NEVER ask software architecture, web development, or IT questions. Keep the focus entirely on data science and machine learning.
`.trim();
  }

  // 4. DATA ANALYTICS DOMAIN GUIDELINES
  if (normDomain.includes("data_analytic") || normDomain.includes("analytics")) {
    const daGuidelines: Record<number, string[]> = {
      0: [
        "Variation Angle 1 (Analytical Window Functions): Complex ranking, rolling averages, and lead/lag partitioning for customer transaction trends in SQL.",
        "Variation Angle 2 (Query Optimization): Eliminating Cartesian joins and optimizing complex Common Table Expressions (CTEs) across billion-row warehouses.",
        "Variation Angle 3 (Recursive Queries): Writing recursive SQL CTEs to navigate hierarchical organizational or product category trees.",
      ],
      1: [
        "Variation Angle 1 (Cohort Retention Analysis): Structuring SQL queries to build user retention matrices and analyzing cohort decay curves.",
        "Variation Angle 2 (Marketing Funnel Attribution): Evaluating first-touch, last-touch, and multi-touch attribution models for customer acquisition spend.",
        "Variation Angle 3 (Executive KPI Diagnostics): Diagnosing a sudden 15% drop in Net Promoter Score alongside increased conversion rates.",
      ],
      2: [
        "Variation Angle 1 (Dimensional Modeling): Designing star vs snowflake schema fact and dimension tables for an enterprise e-commerce platform.",
        "Variation Angle 2 (Slowly Changing Dimensions): Implementing SCD Type 2 tracking to preserve historical audit accuracy on customer attributes.",
        "Variation Angle 3 (Warehouse Partitioning): Optimizing clustering and partition keys in Snowflake/BigQuery for analytical reporting speed.",
      ],
      3: [
        "Variation Angle 1 (Executive Dashboard Strategy): Designing 5-second cognitive clarity dashboards for executive leadership without visual clutter.",
        "Variation Angle 2 (Data Discrepancy Reconciliation): Investigating when reporting dashboards diverge from production transactional records.",
        "Variation Angle 3 (Data Storytelling): Translating complex analytical variance findings into non-technical operational recommendations.",
      ],
      4: [
        "Variation Angle 1 (A/B Test Metric Disagreement): Interpreting when an experimentation variant lifts conversion but decreases average order value.",
        "Variation Angle 2 (Sample Size & MDE): Calculating sample size requirements and guarding against peeking problems in experimentation.",
        "Variation Angle 3 (Novelty Effects): Detecting and isolating user novelty effects in long-running feature rollouts.",
      ],
    };
    const angles = daGuidelines[pillarIndex] || daGuidelines[0];
    return `
SCENARIO DIVERSIFICATION DIRECTIVE (STRICT DATA ANALYTICS DOMAIN FOCUS):
To guarantee deep data analytics assessment, explore an alternative concrete analytics scenario:
- ${angles.join("\n- ")}
- Ensure the question tests ${pillarName || "the active data analytics pillar"} under ${diff} expectations with SQL patterns, business metrics, or dimensional warehousing concepts.
- STRICT RULE: NEVER ask software engineering, backend microservices, or IT systems questions. Keep the focus entirely on data analytics.
`.trim();
  }

  // 5. CYBERSECURITY DOMAIN GUIDELINES
  if (normDomain.includes("cyber") || normDomain.includes("security")) {
    const cyberGuidelines: Record<number, string[]> = {
      0: [
        "Variation Angle 1 (STRIDE Threat Modeling): Deconstructing an external checkout API into data flows, trust boundaries, and threat categorizations.",
        "Variation Angle 2 (Vulnerability Prioritization): Triaging 5,000 open vulnerabilities using CVSS scores, exploitability metrics, and business asset value.",
        "Variation Angle 3 (Attack Surface Mapping): Uncovering exposed shadow IT and vulnerable third-party library dependencies in the perimeter.",
      ],
      1: [
        "Variation Angle 1 (Zero Trust Implementation): Transitioning from perimeter defense to identity-based micro-segmentation and least-privilege egress filtering.",
        "Variation Angle 2 (Layer 7 DDoS Defense): Mitigating sophisticated application-layer HTTP flood attacks without blocking legitimate traffic.",
        "Variation Angle 3 (Network Microsegmentation): Isolating PCI-DSS cardholder data environments from corporate workstations.",
      ],
      2: [
        "Variation Angle 1 (Least Privilege IAM Policies): Designing granular AWS/GCP IAM roles with condition blocks to eliminate wildcard permissions.",
        "Variation Angle 2 (SAML vs OAuth2/OIDC): Securing single sign-on flows against token replay and session fixation attacks.",
        "Variation Angle 3 (Credential Dumping Defense): Hardening domain controllers and cloud IAM against Mimikatz, Pass-the-Hash, and Kerberoasting.",
      ],
      3: [
        "Variation Angle 1 (Ransomware Containment): Executing containment and forensic preservation within the first 60 minutes of ransomware detection.",
        "Variation Angle 2 (SIEM Correlation Rules): Writing high-fidelity detection logic for slow-and-low credential spraying across disparate authentication logs.",
        "Variation Angle 3 (Threat Hunting): Proactively searching for adversary living-off-the-land techniques (e.g. PowerShell/WMI abuse).",
      ],
      4: [
        "Variation Angle 1 (OWASP Top 10 Prevention): Eliminating Server-Side Request Forgery (SSRF) and SQL injection vulnerabilities through defense-in-depth.",
        "Variation Angle 2 (Cryptographic Hygiene): Implementing TLS 1.3 forward secrecy, secure key rotation, and AES-GCM envelope encryption.",
        "Variation Angle 3 (SOC 2 & Compliance Auditing): Establishing continuous compliance evidence collection for SOC 2 Type II and ISO 27001.",
      ],
    };
    const angles = cyberGuidelines[pillarIndex] || cyberGuidelines[0];
    return `
SCENARIO DIVERSIFICATION DIRECTIVE (STRICT CYBERSECURITY DOMAIN FOCUS):
To guarantee deep cybersecurity assessment, explore an alternative concrete security scenario:
- ${angles.join("\n- ")}
- Ensure the question tests ${pillarName || "the active cybersecurity pillar"} under ${diff} expectations with threat modeling, defense in depth, or incident response tactics.
- STRICT RULE: NEVER ask generic software development or frontend questions. Keep the focus entirely on cybersecurity.
`.trim();
  }

  // 3. TECHNICAL / SOFTWARE ENGINEERING GUIDELINES (DEFAULT)
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
â€¢ ${pillarAngles.join("\nâ€¢ ")}
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
  const normDomain = (domain || "").toLowerCase().trim();

  // 1. FINANCE FALLBACK QUESTIONS
  if (normDomain.includes("finance")) {
    const financeFallbacks: Record<number, string[]> = {
      0: [
        "Walk me through how a 100-basis-point increase in the risk-free rate ripples through the Capital Asset Pricing Model (CAPM) to affect a company's WACC and intrinsic DCF equity value.",
        "Suppose you are evaluating two companies in the same industry: Company A trades at 15x EV/EBITDA and Company B trades at 9x. What key financial drivers would justify Company A's multiple premium?",
        "In an LBO model, if a financial sponsor wants to achieve a 20% IRR over a 5-year investment horizon, what are the three primary levers they can pull to hit that return threshold?",
      ],
      1: [
        "If a company's revenue grew 25% year-over-year, but operating cash flow turned significantly negative, where on the balance sheet and cash flow statement would you look first to diagnose the liquidity gap?",
        "Walk me through how an increase of $10 million in accounts receivable impacts the three financial statements: Income Statement, Balance Sheet, and Statement of Cash Flows.",
        "How do you treat operating leases under ASC 842 / IFRS 16 on the balance sheet, and what is the resulting effect on reported EBITDA and leverage ratios?",
      ],
      2: [
        "When a company is deciding whether to fund a major capital expenditure through senior term debt, convertible bonds, or an equity offering, what financial metrics and market conditions guide that decision?",
        "Suppose a corporation's net debt to EBITDA covenant is set at 3.5x, and a macroeconomic downturn pushes leverage to 3.8x. What liquidity and restructuring remedies should the treasury team evaluate?",
        "How would you determine a company's optimal capital structure using the trade-off theory between the tax shield of debt and the cost of financial distress?",
      ],
      3: [
        "Suppose a corporate treasury has significant euro-denominated receivables due in 90 days. How would you compare using forward currency contracts versus purchasing put options to hedge the downside FX risk?",
        "What are the primary strengths and blind spots of using parametric Value at Risk (VaR) versus historical simulation when stress-testing a portfolio under tail-risk market shocks?",
        "Explain how an interest rate swap works from the perspective of a company looking to lock in fixed borrowing costs on a floating-rate bank facility.",
      ],
      4: [
        "If an acquirer with a P/E ratio of 16x acquires a target with a P/E ratio of 22x in an all-stock transaction, is the deal initially accretive or dilutive to EPS, and why?",
        "When modeling an M&A transaction, why are financial analysts typically more confident in factoring cost synergies into valuation compared to revenue synergies?",
        "Walk me through how you would evaluate working capital adjustments and net debt definitions when negotiating the purchase price in a definitive acquisition agreement.",
      ],
    };
    const pool = financeFallbacks[pillarIndex] || financeFallbacks[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 2. ACCOUNTING FALLBACK QUESTIONS
  if (normDomain.includes("account")) {
    const accountingFallbacks: Record<number, string[]> = {
      0: [
        "Walk me through the five-step revenue recognition model under ASC 606, and how you apply it when software licenses and post-contract customer support are sold together.",
        "How does the accounting treatment differ between GAAP and IFRS regarding the reversal of inventory write-downs and the capitalization of development costs?",
        "Explain the balance sheet and income statement mechanics of recognizing a finance lease versus an operating lease under ASC 842.",
      ],
      1: [
        "Suppose your monthly bank reconciliation shows a $250,000 difference between the general ledger cash balance and the bank statement. What step-by-step investigation process do you follow?",
        "Walk me through the required adjusting journal entries at year-end for an unearned subscription revenue balance of $120,000 where 4 months of service have been delivered.",
        "How do you record the journal entries for a foreign currency transaction between the transaction date, the balance sheet date, and the final settlement date?",
      ],
      2: [
        "How do you determine the appropriate allowance for doubtful accounts using an aging schedule, and how does writing off a specific uncollectible account impact net income and the balance sheet?",
        "Explain how changing from the FIFO inventory valuation method to LIFO during a period of rising prices affects cost of goods sold, ending inventory, and income taxes.",
        "When a company settles a warranty claim, how does that impact the previously established warranty liability account and current period net income?",
      ],
      3: [
        "If you discover that the accounts payable clerk has permissions to both add new vendor records and approve invoice payments, what compensating internal controls would you immediately implement?",
        "What substantive audit procedures would you execute to verify that year-end accounts payable are not materially understated due to unrecorded liabilities?",
        "Walk me through how an auditor tests the design and operating effectiveness of automated application controls under SOX Section 404.",
      ],
      4: [
        "Explain the difference between permanent and temporary book-tax differences, and give two real-world examples of each.",
        "Under what conditions must a corporation establish a valuation allowance against its deferred tax assets under ASC 740?",
        "How does the mandatory 5-year amortization of Section 174 research and development expenditures affect a company's taxable income versus GAAP financial accounting?",
      ],
    };
    const pool = accountingFallbacks[pillarIndex] || accountingFallbacks[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 3. DATA SCIENCE FALLBACK QUESTIONS
  if (normDomain.includes("data_science") || normDomain.includes("data science")) {
    const dsFallbacks: Record<number, string[]> = {
      0: [
        "When testing two variant models, why might a high p-value lead to a false sense of security if statistical power was insufficient?",
        "Explain how you address extreme class imbalance (1 positive in 10,000 cases) when training a predictive fraud detection model.",
        "How do you determine whether continuous data should be transformed using Box-Cox or Yeo-Johnson before fitting a parametric regression model?",
      ],
      1: [
        "Walk me through how Target Encoding can introduce subtle data leakage during cross-validation, and what out-of-fold strategies you use to prevent it.",
        "When would you choose PCA over t-SNE or UMAP for dimensionality reduction, and why can t-SNE not be directly applied to transform new test data?",
        "How do you handle missing values in a dataset when the missingness mechanism is Missing Not At Random (MNAR)?",
      ],
      2: [
        "How does Gradient Boosting differ from Random Forest in how trees are added to minimize loss, and what specific hyperparameters do you tune first to avoid overfitting in XGBoost?",
        "Under what conditions would you choose an L1-regularized Logistic Regression model over a deep neural network for a production classification task?",
        "Explain how the kernel trick works in Support Vector Machines (SVM), and when you would select a Radial Basis Function (RBF) kernel over a linear kernel.",
      ],
      3: [
        "Explain why ROC-AUC can be deceptively optimistic on heavily skewed datasets, and why Precision-Recall AUC (PR-AUC) is a better evaluation metric for anomaly detection.",
        "Walk me through the bias-variance tradeoff: what specific diagnostic indicators tell you a model has high variance versus high bias, and what steps fix each?",
        "How do you structure Purged Group Time-Series cross-validation to prevent lookahead bias when modeling chronological financial data?",
      ],
      4: [
        "Suppose your deployed machine learning model's performance drops by 20% three months after launch. How do you distinguish between covariate shift, prior shift, and concept drift?",
        "Explain how TreeSHAP calculates feature attributions for a complex gradient-boosted tree, and how it satisfies the efficiency and additivity properties.",
        "What architectural strategies do you implement to guarantee sub-50ms p99 inference latency for a complex model serving real-time requests?",
      ],
    };
    const pool = dsFallbacks[pillarIndex] || dsFallbacks[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 4. DATA ANALYTICS FALLBACK QUESTIONS
  if (normDomain.includes("data_analytic") || normDomain.includes("analytics")) {
    const daFallbacks: Record<number, string[]> = {
      0: [
        "Walk me through the difference between ROW_NUMBER(), RANK(), and DENSE_RANK() in SQL, and write a query pattern to find the top 3 highest-spending customers per market region.",
        "How do window functions like LAG() and LEAD() work over partitioned frames, and how would you use them to calculate week-over-week user retention?",
        "How do you optimize a query joining a 2-billion-row transactional event table with a 50-million-row user dimension table in a cloud data warehouse like Snowflake or BigQuery?",
      ],
      1: [
        "How would you construct a monthly cohort retention table in SQL to analyze 12-month user retention across organic versus paid acquisition channels?",
        "If Customer Acquisition Cost (CAC) dropped by 30% but total monthly revenue also fell by 15%, how would you diagnose what happened to sales efficiency?",
        "Walk me through the metrics and funnel stages you would define to diagnose user drop-off in a multi-step e-commerce checkout flow.",
      ],
      2: [
        "Explain the architectural difference between a Kimball star schema and a snowflake schema, and under what conditions you would denormalize dimension tables.",
        "What are Slowly Changing Dimensions (SCD Type 1 vs Type 2 vs Type 3), and how would you implement an SCD Type 2 table to maintain complete historical audit accuracy?",
        "When designing a data warehouse in BigQuery or Snowflake, how do you decide on clustering keys and partition strategies to minimize query costs?",
      ],
      3: [
        "When designing an executive dashboard for the C-suite, what visual hierarchy principles ensure they can spot operational risks within 5 seconds?",
        "Suppose an executive complains that the BI dashboard numbers diverge from the operational database. Walk me through your step-by-step audit process.",
        "How do you communicate a complex statistical finding to non-technical business stakeholders to drive an immediate operational pivot?",
      ],
      4: [
        "In an A/B test where a new checkout experience shows a 6% increase in conversion rate but a 4% decline in average order value (AOV), how do you evaluate overall business impact?",
        "How do you calculate the minimum detectable effect (MDE) and required sample size before starting an experiment, and why is early stopping risky?",
        "How do you detect and isolate novelty effects versus genuine sustained behavioral change in long-term experimentation cohorts?",
      ],
    };
    const pool = daFallbacks[pillarIndex] || daFallbacks[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 5. CYBERSECURITY FALLBACK QUESTIONS
  if (normDomain.includes("cyber") || normDomain.includes("security")) {
    const cyberFallbacks: Record<number, string[]> = {
      0: [
        "Walk me through applying the STRIDE threat modeling framework to an enterprise customer portal accepting payment transactions.",
        "How do you evaluate CVSS v3.1 base, temporal, and environmental scores to prioritize patch remediation when facing 5,000 open vulnerabilities across a hybrid infrastructure?",
        "What methodology do you use to uncover exposed assets, vulnerable open ports, and leaked credentials across an organization's public attack surface?",
      ],
      1: [
        "Explain how a Zero Trust architecture replaces legacy network perimeter security, and how micro-segmentation limits the blast radius of a compromised host.",
        "How do you design network defenses to protect internal infrastructure against Layer 7 application-level HTTP flood DDoS attacks?",
        "What are the network security differences between inspecting traffic with a stateful firewall versus a Web Application Firewall (WAF) and an IDS/IPS?",
      ],
      2: [
        "Suppose an attacker compromises a developer's access credentials. How do least-privilege IAM policies, condition blocks, and session binding prevent lateral movement?",
        "Explain the authentication handshake differences between SAML 2.0 and OAuth2 / OpenID Connect, and walk through how token replay attacks are mitigated.",
        "How do you defend an Active Directory or cloud identity environment against Pass-the-Hash, Golden Ticket, and Kerberoasting attacks?",
      ],
      3: [
        "Walk me through the containment, eradication, and forensic root-cause analysis steps when an EDR agent flags active credential dumping (e.g. Mimikatz) on a production server.",
        "How do you structure SIEM correlation rules to detect slow-and-low distributed password spraying across multiple single sign-on endpoints?",
        "What indicators of compromise (IOCs) and memory artifacts do you look for when hunting for living-off-the-land adversary techniques using native system binaries?",
      ],
      4: [
        "Explain the mechanics of a SQL injection vulnerability versus a Server-Side Request Forgery (SSRF) vulnerability, and what defense-in-depth measures guarantee prevention.",
        "What are the core technical requirements for securing sensitive financial data at rest and in transit under SOC 2 Type II and PCI-DSS compliance frameworks?",
        "How do you enforce automated security linting, dependency vulnerability scanning (SCA), and container image verification within a modern CI/CD pipeline?",
      ],
    };
    const pool = cyberFallbacks[pillarIndex] || cyberFallbacks[0];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 3. TECHNICAL / SOFTWARE ENGINEERING FALLBACK QUESTIONS (DEFAULT)
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

