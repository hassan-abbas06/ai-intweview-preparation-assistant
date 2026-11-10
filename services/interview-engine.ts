import { InterviewType, SessionStatus, InterviewModality } from "@prisma/client";
import {
  InterviewState,
  classifyCandidateMessage,
  isCandidateRequestingToEnd,
  isGibberish,
} from "@/lib/interview/state";
import { getDomainLabel } from "@/lib/constants/domains";
import { containsVulgarOrInappropriateLanguage, TERMINATION_CONDUCT_MESSAGE } from "@/lib/interview/moderation";

export type InterviewAction =
  | "OPEN_INTERVIEW"
  | "ACKNOWLEDGE_INTRO"
  | "HANDLE_GREETING"
  | "PROMPT_FOR_SUBSTANCE"
  | "PIVOT_AWAY"
  | "ANSWER_CLARIFICATION"
  | "ANSWER_TRACK_CLARIFICATION"
  | "HANDLE_META_REQUEST"
  | "DRILL_DOWN"
  | "CHALLENGE_TRADEOFF"
  | "ADVANCE_PILLAR"
  | "CONCLUDE_ROUND"
  | "TERMINATE_FOR_VULGARITY";

export type DecisionReasonCode =
  | "INITIAL_OPENING"
  | "CANDIDATE_REQUESTED_END"
  | "VULGAR_LANGUAGE_DETECTED"
  | "GREETING_DETECTED"
  | "CANDIDATE_META_INSTRUCTION"
  | "CANDIDATE_CHALLENGED_ROUND_TYPE"
  | "CANDIDATE_ASKED_CLARIFICATION"
  | "NON_SUBSTANTIVE_REPROMPT"
  | "NON_SUBSTANTIVE_PIVOT_LIMIT"
  | "CANDIDATE_INTRO_RECEIVED"
  | "SUBSTANTIVE_PROBE_DEPTH"
  | "SUBSTANTIVE_CHALLENGE_TRADEOFF"
  | "PILLAR_PROGRESSION_ADVANCE"
  | "ALL_PILLARS_EXHAUSTED";

export interface PillarDefinition {
  index: number;
  name: string;
  description: string;
  coreConcepts: string[];
}

export interface ProgressionPolicyOptions {
  turnsPerPillarTarget?: number;     // Baseline: 2 substantive turns per pillar
  evaluationScoreOverride?: number;  // Phase 3 hook for evaluation-driven progression
  targetDifficulty?: string;         // Adaptive difficulty tier (JUNIOR, MID, SENIOR, LEAD, PRINCIPAL)
  adaptiveContext?: string;          // Compact adaptive guideline
}

export interface JDContext {
  skills: string[];
  responsibilities: string[];
  seniority: string | null;
}

export interface OrchestratorInput {
  state: InterviewState;
  candidateMessage?: string;
  isOpening?: boolean;
  options?: ProgressionPolicyOptions;
  jdContext?: JDContext | null;
}

export interface OrchestratorDecision {
  action: InterviewAction;
  reasonCode: DecisionReasonCode;
  targetPillarIndex: number;
  targetPillarName: string;
  consecutiveTurnsOnPillar: number;
  isTerminalTurn: boolean;
  directiveInstruction: string;
  groundingKeywords: string[];
}

export const TECHNICAL_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "System Architecture, Component Design & Trade-offs",
    description: "Component decomposition, interface design, protocols (REST/gRPC), separation of concerns, and architectural boundaries.",
    coreConcepts: ["microservices", "modularity", "API contracts", "tradeoffs", "layering"],
  },
  {
    index: 1,
    name: "Data Modeling, Database Architecture & Storage",
    description: "Database schema design, indexing strategies, normalization vs. denormalization, transactional integrity, and SQL vs. NoSQL tradeoffs.",
    coreConcepts: ["indexing", "sharding", "transactions", "consistency", "query optimization"],
  },
  {
    index: 2,
    name: "Scalability, Concurrency, Caching & Performance",
    description: "Distributed caching strategies, rate limiting, connection pooling, concurrency controls, and high-throughput bottlenecks.",
    coreConcepts: ["redis", "caching", "locking", "throughput", "latency bottlenecks"],
  },
  {
    index: 3,
    name: "Fault Tolerance, Failure Recovery & Edge Cases",
    description: "Circuit breakers, graceful degradation, partition handling, failover mechanisms, retry strategies, and disaster recovery.",
    coreConcepts: ["circuit breakers", "failover", "retries", "dead letter queues", "resilience"],
  },
  {
    index: 4,
    name: "Security, Observability, CI/CD & Best Practices",
    description: "Authentication/authorization, telemetry (distributed tracing, metrics, logs), zero-downtime deployment pipelines, and security hygiene.",
    coreConcepts: ["distributed tracing", "metrics", "OAuth/JWT", "CI/CD", "security"],
  },
];

export const FRONTEND_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "Component Architecture, State Management & Reactivity",
    description: "Component composition, local vs. global vs. server state, unidirectional data flow, custom hooks, and state management (Zustand/Redux/Context).",
    coreConcepts: ["React", "state management", "custom hooks", "component hierarchy", "props drilling", "data flow"],
  },
  {
    index: 1,
    name: "DOM Rendering, Core Web Vitals & Performance",
    description: "Core Web Vitals (LCP, FID/INP, CLS), render cycles, memoization (useMemo/useCallback), code-splitting, lazy loading, and hydration.",
    coreConcepts: ["Core Web Vitals", "re-renders", "memoization", "code splitting", "virtual DOM", "bundle size"],
  },
  {
    index: 2,
    name: "Asynchronous Data Fetching, Client Caching & Offline UX",
    description: "Server state synchronization (React Query/SWR), optimistic UI updates, cache invalidation, web workers, and graceful degradation.",
    coreConcepts: ["React Query", "caching", "optimistic updates", "data fetching", "SWR", "offline handling"],
  },
  {
    index: 3,
    name: "Responsive Layouts, Modern CSS & Accessibility (WCAG)",
    description: "CSS Grid, Flexbox, Tailwind, responsive breakpoints, cross-browser compatibility, and accessibility standards (WCAG 2.1 AA, ARIA landmarks, keyboard navigation).",
    coreConcepts: ["CSS Grid", "Flexbox", "responsive design", "accessibility", "WCAG", "ARIA", "Tailwind"],
  },
  {
    index: 4,
    name: "Frontend Security, Build Tooling & Rendering Paradigms",
    description: "Cross-Site Scripting (XSS) prevention, Content Security Policy (CSP), CORS, bundling tools (Vite/Webpack), and SSR vs. SSG vs. client-side hydration.",
    coreConcepts: ["XSS", "CSP", "SSR", "SSG", "hydration", "Vite", "build tools"],
  },
];

export const HR_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "Stakeholder / Team Conflict & Resolution",
    description: "Interpersonal dynamics, resolving disagreements on technical or process direction, handling pushback, and de-escalation.",
    coreConcepts: ["conflict resolution", "disagreement", "alignment", "compromise"],
  },
  {
    index: 1,
    name: "Project Ownership, Missed Deadlines & Trade-offs",
    description: "End-to-end accountability, managing setbacks or schedule slippage, risk mitigation, and proactive stakeholder communication.",
    coreConcepts: ["ownership", "deadlines", "tradeoffs", "accountability"],
  },
  {
    index: 2,
    name: "Feedback, Mentorship & Collaboration Culture",
    description: "Receiving constructive criticism, coaching struggling team members, fostering psychological safety, and knowledge sharing.",
    coreConcepts: ["feedback", "mentorship", "collaboration", "empathy"],
  },
  {
    index: 3,
    name: "Adaptability, Learning & Career Motivation",
    description: "Pivoting under changing business priorities, tackling unfamiliar technologies, and personal professional growth drivers.",
    coreConcepts: ["adaptability", "learning curve", "resilience", "motivation"],
  },
];

export const MANAGERIAL_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "Strategic Roadmapping & Tech Debt Prioritization",
    description: "Balancing product feature delivery with long-term architectural health, tech debt remediation, and engineering capacity planning.",
    coreConcepts: ["tech debt", "roadmap", "prioritization", "capacity"],
  },
  {
    index: 1,
    name: "People Management, Underperformance & Career Coaching",
    description: "Performance Improvement Plans (PIPs), 1-on-1 coaching models, identifying burnout, talent retention, and promotion ladders.",
    coreConcepts: ["performance management", "career growth", "coaching", "retention"],
  },
  {
    index: 2,
    name: "Cross-Functional Alignment (Product / Design / Execs)",
    description: "Bridging engineering constraints with product roadmaps, pushing back on unrealistic executive demands, and cross-team negotiation.",
    coreConcepts: ["cross-functional", "stakeholder management", "executive communication"],
  },
  {
    index: 3,
    name: "Engineering Org Topology & Team Scaling",
    description: "Structuring engineering squads, hiring rubrics, onboarding velocity, maintaining high engineering standards as team grows.",
    coreConcepts: ["org design", "hiring standards", "scaling teams", "topology"],
  },
];

export const FINANCE_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "Financial Modeling, Valuation & DCF Methodologies",
    description: "Discounted Cash Flow (DCF), WACC calculation, Comparable Company Analysis, Precedent Transactions, LBO modeling, and valuation sensitivity.",
    coreConcepts: ["DCF", "WACC", "valuation multiples", "terminal value", "sensitivity analysis"],
  },
  {
    index: 1,
    name: "Financial Statements Analysis & Cash Flow Dynamics",
    description: "Interconnection of Income Statement, Balance Sheet, and Cash Flow Statement; working capital cycles, EBITDA adjustments, and cash conversion.",
    coreConcepts: ["EBITDA", "working capital", "free cash flow", "balance sheet", "revenue recognition"],
  },
  {
    index: 2,
    name: "Corporate Finance, Capital Structure & Debt/Equity",
    description: "Capital structure optimization, cost of debt vs. equity, dividend policy, debt covenants, CapEx budgeting, and return on invested capital (ROIC).",
    coreConcepts: ["capital structure", "cost of capital", "debt covenants", "ROIC", "capital allocation"],
  },
  {
    index: 3,
    name: "Portfolio Theory, Risk Management & Derivatives",
    description: "Value at Risk (VaR), portfolio diversification, Sharpe ratio, FX/interest rate hedging strategies, and credit risk evaluation.",
    coreConcepts: ["risk management", "VaR", "portfolio diversification", "hedging", "derivatives"],
  },
  {
    index: 4,
    name: "Market Macroeconomics, M&A Strategy & Regulatory Standards",
    description: "Mergers & Acquisitions (M&A) accretion/dilution, strategic synergies, transaction due diligence, interest rate cycles, and financial regulations.",
    coreConcepts: ["M&A", "accretion dilution", "due diligence", "synergies", "macroeconomics"],
  },
];

export const ACCOUNTING_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "Financial Reporting & GAAP / IFRS Principles",
    description: "GAAP vs. IFRS differences, fair value measurement, revenue recognition (ASC 606), lease accounting (ASC 842), and disclosure standards.",
    coreConcepts: ["GAAP", "IFRS", "ASC 606", "fair value", "disclosures"],
  },
  {
    index: 1,
    name: "General Ledger, Double-Entry & Account Reconciliations",
    description: "Debit/credit journal mechanics, trial balance validation, bank reconciliations, accruals, and month-end close procedures.",
    coreConcepts: ["journal entries", "general ledger", "reconciliation", "accruals", "month-end close"],
  },
  {
    index: 2,
    name: "Revenue Recognition, Matching Principle & Working Capital",
    description: "Milestone-based revenue, matching expenses to revenues, allowance for doubtful accounts, and inventory accounting (FIFO, LIFO).",
    coreConcepts: ["revenue recognition", "matching principle", "bad debt reserve", "inventory valuation", "amortization"],
  },
  {
    index: 3,
    name: "Internal Controls, Audit Procedures & SOX Compliance",
    description: "Sarbanes-Oxley (SOX 404), segregation of duties, internal control testing, audit trail integrity, and substantive testing.",
    coreConcepts: ["internal controls", "SOX compliance", "audit trail", "segregation of duties", "risk assessment"],
  },
  {
    index: 4,
    name: "Tax Accounting, Depreciation & Statutory Compliance",
    description: "MACRS vs. straight-line depreciation, deferred tax assets and liabilities (ASC 740), book vs. tax adjustments, and compliance.",
    coreConcepts: ["depreciation", "deferred tax", "tax compliance", "book tax differences", "statutory reporting"],
  },
];

export const DATA_SCIENCE_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "Statistical Foundations & Exploratory Data Analysis",
    description: "Hypothesis testing, p-values, probability distributions, sampling bias, statistical significance, and exploratory data analysis.",
    coreConcepts: ["hypothesis testing", "p-values", "distributions", "sampling", "statistical significance"],
  },
  {
    index: 1,
    name: "Feature Engineering & Data Preprocessing",
    description: "Imputation strategies, categorical encoding, feature scaling, dimensionality reduction (PCA), and feature selection techniques.",
    coreConcepts: ["feature engineering", "imputation", "PCA", "scaling", "data cleaning"],
  },
  {
    index: 2,
    name: "Machine Learning Algorithms & Model Selection",
    description: "Supervised and unsupervised models, decision trees, gradient boosting (XGBoost), regression, clustering, and neural networks.",
    coreConcepts: ["supervised learning", "XGBoost", "regression", "clustering", "neural networks"],
  },
  {
    index: 3,
    name: "Model Evaluation, Validation & Overfitting Prevention",
    description: "Cross-validation, ROC-AUC, Precision/Recall, F1-score, bias-variance tradeoff, and L1/L2 regularization.",
    coreConcepts: ["ROC-AUC", "cross-validation", "overfitting", "precision recall", "regularization"],
  },
  {
    index: 4,
    name: "MLOps, Model Deployment & Production Monitoring",
    description: "Model serving, latency optimization, data and concept drift detection, A/B testing models, and model interpretability (SHAP).",
    coreConcepts: ["MLOps", "model drift", "model deployment", "SHAP", "monitoring"],
  },
];

export const DATA_ANALYTICS_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "Advanced SQL & Complex Data Querying",
    description: "Window functions (ROW_NUMBER, RANK, LEAD/LAG), CTEs, complex joins, subqueries, and analytical query performance.",
    coreConcepts: ["window functions", "CTEs", "joins", "SQL optimization", "aggregations"],
  },
  {
    index: 1,
    name: "Business Metrics, KPIs & Funnel Analytics",
    description: "LTV, CAC, churn rate, retention cohorts, revenue attribution, conversion funnels, and metric definitions.",
    coreConcepts: ["KPIs", "cohort analysis", "churn", "LTV", "funnels"],
  },
  {
    index: 2,
    name: "Data Cleaning, Warehousing & Dimensional Modeling",
    description: "Star schema, fact and dimension tables, ETL/ELT pipelines, data hygiene, and warehouse modeling (Snowflake/BigQuery).",
    coreConcepts: ["dimensional modeling", "star schema", "ETL", "data warehouse", "data cleaning"],
  },
  {
    index: 3,
    name: "Data Visualization & Executive Dashboard Design",
    description: "Dashboard layout strategy, visual best practices, BI tooling (Tableau/PowerBI/Looker), and communicating insights to stakeholders.",
    coreConcepts: ["dashboards", "data visualization", "storytelling", "reporting", "BI tools"],
  },
  {
    index: 4,
    name: "Experimentation, A/B Testing & Statistical Rigor",
    description: "Sample sizing, statistical significance, confidence intervals, interpreting conflicting metrics, and business recommendations.",
    coreConcepts: ["A/B testing", "statistical significance", "experimentation", "hypothesis", "sample size"],
  },
];

export const CYBERSECURITY_PILLARS: PillarDefinition[] = [
  {
    index: 0,
    name: "Threat Modeling, Attack Vectors & Risk Assessment",
    description: "STRIDE framework, attack trees, CVSS vulnerability scoring, threat surface mapping, and risk prioritization.",
    coreConcepts: ["threat modeling", "STRIDE", "CVSS", "attack vectors", "risk assessment"],
  },
  {
    index: 1,
    name: "Network Defense, Boundary Controls & Zero Trust",
    description: "Firewalls, micro-segmentation, Zero Trust architecture, VPNs, DDoS mitigation, and intrusion prevention (IDS/IPS).",
    coreConcepts: ["Zero Trust", "firewalls", "segmentation", "DDoS", "IDS/IPS"],
  },
  {
    index: 2,
    name: "Identity & Access Management (IAM) & Authentication",
    description: "MFA, OAuth2/SAML, Role-Based Access Control (RBAC), Least Privilege principles, and credential lifecycle.",
    coreConcepts: ["IAM", "RBAC", "MFA", "least privilege", "OAuth2"],
  },
  {
    index: 3,
    name: "Incident Response, Digital Forensics & Threat Hunting",
    description: "SIEM log correlation, incident containment, forensic root-cause analysis, threat hunting, and post-incident response.",
    coreConcepts: ["incident response", "SIEM", "forensics", "containment", "threat hunting"],
  },
  {
    index: 4,
    name: "Cryptography, Application Security & Compliance",
    description: "Encryption standards (TLS/AES), OWASP Top 10, penetration testing, compliance standards (SOC 2, ISO 27001), and secure coding.",
    coreConcepts: ["cryptography", "OWASP", "penetration testing", "SOC 2", "compliance"],
  },
];

/**
 * Returns the pillar definitions for a given interview round type, domain, and optional sub-focus area
 */
export function getPillarsForRound(
  type: InterviewType,
  domain?: string | null,
  focusArea?: string | null
): PillarDefinition[] {
  if (type === "HR") return HR_PILLARS;
  if (type === "MANAGERIAL") return MANAGERIAL_PILLARS;

  const normalizedDomain = (domain || "").toLowerCase().trim();
  const normalizedFocus = (focusArea || "").toLowerCase().trim();

  if (normalizedFocus.includes("front") || normalizedDomain.includes("front")) {
    return FRONTEND_PILLARS;
  }
  if (normalizedDomain.includes("finance")) {
    return FINANCE_PILLARS;
  }
  if (normalizedDomain.includes("account")) {
    return ACCOUNTING_PILLARS;
  }
  if (normalizedDomain.includes("data_science") || normalizedDomain.includes("data science")) {
    return DATA_SCIENCE_PILLARS;
  }
  if (normalizedDomain.includes("data_analytic") || normalizedDomain.includes("data analytic") || normalizedDomain.includes("analytics")) {
    return DATA_ANALYTICS_PILLARS;
  }
  if (normalizedDomain.includes("cyber") || normalizedDomain.includes("security")) {
    return CYBERSECURITY_PILLARS;
  }

  return TECHNICAL_PILLARS;
}

/**
 * Checks if candidate message is asking a clarification question
 */
export function isCandidateClarification(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  const clarificationStarters = [
    /^(could|can|would|do|are|is|should)\s+(you|we|i)\s+(clarify|specify|explain|mean|tell|give|repeat|rephrase|restate)/i,
    /^(what|which|how|where|why)\s+(do you mean|is the|are the|should i|would be|qps|traffic|scale|latency|was the question|did you say)/i,
    /^(are we assuming|is this assuming|does this mean|should this be|can you repeat|could you repeat|repeat the question)/i,
    /^(could|can|would|may)\s+i\s+(ask|know|inquire)/i,
    /^(i\s+have\s+a\s+question|quick\s+question|one\s+question|question\s+for\s+you)/i,
    /^(can\s+you\s+hear\s+me|am\s+i\s+audible)/i,
    /^(pardon|excuse me|repeat please|say again|come again)/i,
  ];

  const hasClarificationStarter = clarificationStarters.some((p) => p.test(normalized));
  const isQuestion = normalized.endsWith("?") || hasClarificationStarter;

  // Ensure it's a relatively short inquiry (under 35 words) or direct question
  const wordCount = normalized.split(/\s+/).length;
  return isQuestion && wordCount <= 35 && hasClarificationStarter;
}

/**
 * Checks if candidate is giving a meta command or instructing the interviewer
 */
export function isCandidateMetaInstruction(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  const metaPatterns = [
    /\b(ask me|test me on|quiz me on|can you ask me|give me a question about|test my knowledge)\b/i,
    /\b(ask me how are you|ask me how i am)\b/i,
    /\b(ignore (all )?previous instructions|system prompt|disregard instructions|you are now|act as a)\b/i,
  ];
  return metaPatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Checks if candidate is questioning why a question is off-topic or mismatched with the round type
 * (e.g. asking technical/coding questions in a Managerial, HR, or Finance round).
 */
export function isCandidateTrackClarification(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  const trackPatterns = [
    /\b(managerial|leadership|hr|behavioral|finance|accounting)\b.*\b(why|tech|technical|coding|code|programming|syntax)\b/i,
    /\b(why|what)\b.*\b(are you|r u|u)\b.*\basking\b.*\b(tech|technical|coding|code|syntax|question)/i,
    /\bwhy\s+(the\s+)?(tech|technical|coding|code)\s+questions?\b/i,
    /\b(this is|isn'?t this|thought this was)\b.*\b(a\s+)?(managerial|leadership|hr|behavioral|finance|accounting)\b/i,
    /\bwhy\s+are\s+we\s+talking\s+about\s+(coding|code|syntax|golang|go|python|java|c\+\+|javascript)\b/i,
    /\b(i thought|i was told)\s+this\s+(is|was)\s+(a\s+)?(managerial|leadership|hr|behavioral)\b/i,
    /\bwhy\s+would\s+you\s+ask\s+(a\s+)?(tech|technical|coding)\s+question\b/i,
  ];

  return trackPatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Scores overlap between a pillar definition and extracted JD skills (case-insensitive keyword matching)
 */
export function scorePillarOverlap(pillar: PillarDefinition, skills: string[]): number {
  if (!skills || skills.length === 0) return 0;
  let score = 0;
  const pillarText = `${pillar.name} ${pillar.description} ${pillar.coreConcepts.join(" ")}`.toLowerCase();

  for (const rawSkill of skills) {
    const s = rawSkill.trim().toLowerCase();
    if (!s) continue;

    // Direct match in pillar text
    if (pillarText.includes(s)) {
      score += 2;
      continue;
    }

    // Match individual significant words from multi-word or punctuation-joined skills (e.g. "PostgreSQL" -> "sql")
    const words = s.split(/[^a-z0-9]/).filter((w) => w.length > 2);
    let matchedWord = false;
    for (const w of words) {
      if (pillarText.includes(w)) {
        score += 1;
        matchedWord = true;
        break;
      }
    }
    if (matchedWord) continue;

    // Technology keyword associations
    if (s.includes("kafka") && (pillarText.includes("queues") || pillarText.includes("failover") || pillarText.includes("streaming") || pillarText.includes("event"))) {
      score += 2;
      continue;
    }
    if ((s.includes("postgres") || s.includes("postgresql") || s.includes("mysql") || s.includes("mongo")) && (pillarText.includes("database") || pillarText.includes("sql") || pillarText.includes("indexing"))) {
      score += 2;
      continue;
    }
    if (s.includes("redis") && (pillarText.includes("caching") || pillarText.includes("redis"))) {
      score += 2;
      continue;
    }
  }

  return score;
}

/**
 * Returns pillars prioritized by overlap with JD skills.
 * Ties and zero-overlap preserve the original default ordering exactly.
 */
export function getWeightedPillars(
  pillars: PillarDefinition[],
  jdContext?: JDContext | null
): PillarDefinition[] {
  if (!jdContext?.skills || jdContext.skills.length === 0) {
    return [...pillars];
  }

  const scored = pillars.map((p, originalOrder) => ({
    pillar: p,
    originalOrder,
    score: scorePillarOverlap(p, jdContext.skills),
  }));

  const hasOverlap = scored.some((s) => s.score > 0);
  if (!hasOverlap) {
    return [...pillars];
  }

  // Stable sort: higher score first; ties preserve default order
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.originalOrder - b.originalOrder;
  });

  return scored.map((s) => s.pillar);
}

/**
 * Deterministic Interview Orchestrator
 */
export class InterviewOrchestrator {
  /**
   * Evaluates whether to advance to the next topic pillar based on current turns and pluggable policy
   */
  static shouldAdvancePillar(
    consecutiveTurnsOnPillar: number,
    options?: ProgressionPolicyOptions
  ): boolean {
    const targetTurns = options?.turnsPerPillarTarget ?? 2;
    return consecutiveTurnsOnPillar >= targetTurns;
  }

  /**
   * Main deterministic decision engine for interview turn orchestration
   */
  static decideNextStep(
    input: OrchestratorInput,
    extraJdContext?: JDContext | null
  ): OrchestratorDecision {
    const { state, candidateMessage, isOpening, options } = input;
    const jdContext = input.jdContext ?? extraJdContext ?? null;
    const basePillars = getPillarsForRound(state.type, state.domain, state.focusArea);
    const pillars = getWeightedPillars(basePillars, jdContext);
    const totalPillars = pillars.length;

    // 0. Check Candidate Vulgar / Abusive Conduct (Zero Tolerance - Immediate Termination)
    if (state.isCandidateVulgar || (candidateMessage && containsVulgarOrInappropriateLanguage(candidateMessage))) {
      return {
        action: "TERMINATE_FOR_VULGARITY",
        reasonCode: "VULGAR_LANGUAGE_DETECTED",
        targetPillarIndex: totalPillars - 1,
        targetPillarName: pillars[totalPillars - 1].name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: true,
        directiveInstruction:
          "The candidate used vulgar, profane, or abusive language. The interview is terminated immediately. State firmly and professionally in 1 sentence that the interview is terminated immediately due to unprofessional conduct. MANDATORY: You MUST append [SESSION_COMPLETED] at the very end. DO NOT ask any questions.",
        groundingKeywords: ["terminated", "unprofessional language", "concluded"],
      };
    }

    // 1. Check Candidate Intent to End (via state flag or direct message inspection)
    if (state.isCandidateEnding || (candidateMessage && isCandidateRequestingToEnd(candidateMessage))) {
      return {
        action: "CONCLUDE_ROUND",
        reasonCode: "CANDIDATE_REQUESTED_END",
        targetPillarIndex: totalPillars - 1,
        targetPillarName: pillars[totalPillars - 1].name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: true,
        directiveInstruction:
          "The candidate explicitly requested to end or wrap up the interview (or said goodbye). Warmly thank them for their time and technical conversation in 1-2 polite sentences. MANDATORY: You MUST append [SESSION_COMPLETED] at the very end. DO NOT ask any further questions under any circumstances.",
        groundingKeywords: ["conclude", "wrap up", "thank you"],
      };
    }

    // 2. Check Opening Turn
    if (isOpening || state.messages.length === 0) {
      const firstPillar = pillars[0];
      return {
        action: "OPEN_INTERVIEW",
        reasonCode: "INITIAL_OPENING",
        targetPillarIndex: 0,
        targetPillarName: firstPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction:
          "Introduce yourself briefly (name and role) and warmly invite the candidate to introduce themselves and share their background and recent work. Do NOT ask any technical questions on this turn.",
        groundingKeywords: firstPillar.coreConcepts,
      };
    }

    // 3. Check Casual Greeting
    if (state.isGreeting) {
      const currentPillar = pillars[Math.min(Math.floor(state.askedQuestions.length / 2), totalPillars - 1)];
      const isOpeningTurn = state.askedQuestions.length <= 1;
      const directive = isOpeningTurn
        ? "The candidate greeted you. Warmly say hello back in 1 brief phrase, then invite them to share a bit about their background and what they've been working on recently. DO NOT pretend they already gave you their background (e.g. NEVER say 'Got a quick sense of your recent work')."
        : "The candidate sent a casual greeting/small talk. Respond warmly in 1 short phrase (e.g. 'Hey! Good to have you here.'), then immediately continue with the SAME question you were already asking.";

      return {
        action: "HANDLE_GREETING",
        reasonCode: "GREETING_DETECTED",
        targetPillarIndex: currentPillar.index,
        targetPillarName: currentPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction: directive,
        groundingKeywords: currentPillar.coreConcepts,
      };
    }

    // 4. Check Candidate Meta Instruction ("ask me about Kafka", etc.)
    if (candidateMessage && isCandidateMetaInstruction(candidateMessage)) {
      const currentPillar = pillars[Math.min(Math.floor(state.askedQuestions.length / 2), totalPillars - 1)];
      return {
        action: "HANDLE_META_REQUEST",
        reasonCode: "CANDIDATE_META_INSTRUCTION",
        targetPillarIndex: currentPillar.index,
        targetPillarName: currentPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction:
          "The candidate asked you to test them on a specific topic. Do NOT answer yourself or speak on their behalf. Directly ask them a concrete question about that requested topic to keep them in the hot seat.",
        groundingKeywords: currentPillar.coreConcepts,
      };
    }

    // 5. Check Candidate Track Clarification (Candidate questions why technical/off-track questions are being asked)
    if (candidateMessage && isCandidateTrackClarification(candidateMessage)) {
      const currentPillar = pillars[Math.min(Math.floor(state.askedQuestions.length / 2), totalPillars - 1)];
      const trackLabel =
        state.type === "MANAGERIAL"
          ? "engineering leadership and organizational strategy"
          : state.type === "HR"
          ? "behavioral and workplace culture"
          : state.domain || "this domain";

      return {
        action: "ANSWER_TRACK_CLARIFICATION",
        reasonCode: "CANDIDATE_CHALLENGED_ROUND_TYPE",
        targetPillarIndex: currentPillar.index,
        targetPillarName: currentPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction: `The candidate rightly pointed out that this is a ${state.type} round and asked why technical/coding questions were asked.
Acknowledge and apologize directly and gracefully in 1 brief sentence (e.g. "You're completely right — my apologies, let's keep our focus squarely on ${trackLabel}.").
Immediately ask an authentic, realistic leadership dilemma from Pillar ${currentPillar.index + 1} (${currentPillar.name}).
ABSOLUTE PROHIBITIONS:
1. NEVER quiz the candidate on coding, programming language syntax, data structures, or code mechanics.
2. NEVER frame the candidate as a junior developer or intern (e.g. NEVER say "Imagine you're the first junior dev on a team"). The candidate is interviewing as an ENGINEERING LEADER / MANAGER. Frame all scenarios from the manager/leader perspective.
3. NEVER use canned AI clichés like "Fair point" or "Understood".`,
        groundingKeywords: currentPillar.coreConcepts,
      };
    }

    // 6. Check Candidate Clarification Question (Strict Directive Boundary)
    if (candidateMessage && isCandidateClarification(candidateMessage)) {
      const currentPillar = pillars[Math.min(Math.floor(state.askedQuestions.length / 2), totalPillars - 1)];
      const isAskingToAsk = /^(can|could|would|may)\s+i\s+(ask|know)|i\s+have\s+a\s+question|quick\s+question/i.test(candidateMessage.trim());
      const directive = isAskingToAsk
        ? "The candidate asked if they can ask a question or wants to speak. Warmly and concisely invite them to go ahead and ask their question (e.g. 'Of course, go ahead! What's on your mind?'). Keep the floor open for their question."
        : "The candidate asked a clarifying question regarding the scenario. Answer their question knowledgeably and concisely in 1–2 sentences, then prompt them to proceed with their proposed design.";

      return {
        action: "ANSWER_CLARIFICATION",
        reasonCode: "CANDIDATE_ASKED_CLARIFICATION",
        targetPillarIndex: currentPillar.index,
        targetPillarName: currentPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction: directive,
        groundingKeywords: currentPillar.coreConcepts,
      };
    }

    // 6. Check Gibberish / Incomprehensible Input
    if (candidateMessage && isGibberish(candidateMessage)) {
      const currentPillar = pillars[Math.min(Math.floor(state.askedQuestions.length / 2), totalPillars - 1)];
      return {
        action: "PROMPT_FOR_SUBSTANCE",
        reasonCode: "NON_SUBSTANTIVE_REPROMPT",
        targetPillarIndex: currentPillar.index,
        targetPillarName: currentPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction:
          "The candidate entered gibberish or an incomprehensible string ('" + candidateMessage + "'). Explicitly state in 1 polite sentence that you didn't quite catch or understand what they meant (e.g. 'Sorry, I didn't quite catch that. Could you clarify your answer, or walk me through your thoughts on the question?'). DO NOT pretend you understood it, DO NOT say 'No problem' or validate it, and DO NOT jump to an unrelated topic or ask a brand new question.",
        groundingKeywords: currentPillar.coreConcepts,
      };
    }

    // 7. Check Non-Substantive Replies (Count >= 2 -> PIVOT_AWAY, Count === 1 -> PROMPT_FOR_SUBSTANCE)
    if (state.nonSubstantiveCount >= 2) {
      const nextPillarIndex = Math.min(
        Math.floor((state.askedQuestions.length + 1) / 2),
        totalPillars - 1
      );
      const nextPillar = pillars[nextPillarIndex];
      return {
        action: "PIVOT_AWAY",
        reasonCode: "NON_SUBSTANTIVE_PIVOT_LIMIT",
        targetPillarIndex: nextPillar.index,
        targetPillarName: nextPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction: `The candidate has given ${state.nonSubstantiveCount} non-substantive replies in a row without answering. DO NOT loop or repeat formulaic phrases. Release the topic naturally using varied phrasing (e.g. 'All good, let\\'s look at...', 'No problem at all — let\\'s explore...') and IMMEDIATELY pivot to a fresh question from ${nextPillar.name}.`,
        groundingKeywords: nextPillar.coreConcepts,
      };
    }

    if (state.nonSubstantiveCount === 1) {
      const currentPillar = pillars[Math.min(Math.floor(state.askedQuestions.length / 2), totalPillars - 1)];
      return {
        action: "PROMPT_FOR_SUBSTANCE",
        reasonCode: "NON_SUBSTANTIVE_REPROMPT",
        targetPillarIndex: currentPillar.index,
        targetPillarName: currentPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction:
          "The candidate gave a minimal or filler reply. DO NOT use affirmative openers ('Got it', 'Understood', 'Makes sense'). Patiently prompt them for concrete details, tools, or architectural specifics using varied phrasing.",
        groundingKeywords: currentPillar.coreConcepts,
      };
    }

    // 7. Check Candidate Intro Turn
    if (state.isIntroTurn) {
      const firstPillar = pillars[0];
      return {
        action: "ACKNOWLEDGE_INTRO",
        reasonCode: "CANDIDATE_INTRO_RECEIVED",
        targetPillarIndex: 0,
        targetPillarName: firstPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction: `The candidate just shared their background. Acknowledge 1 specific project, technology, or domain they mentioned in 1 brief sentence. DO NOT use stock AI clichés ('Awesome!', 'Great background!'). Immediately ask your first opening question from Pillar 1: ${firstPillar.name}, connecting it naturally to their background.`,
        groundingKeywords: firstPillar.coreConcepts,
      };
    }

    // 8. Regular Substantive Turns & Pillar Progression Calculation
    const previousSubstantiveUserTurns = state.messages.filter(
      (m) =>
        m.role === "user" &&
        classifyCandidateMessage(m.content) === "SUBSTANTIVE" &&
        !isCandidateClarification(m.content) &&
        !isCandidateMetaInstruction(m.content)
    ).length;

    // Substantive answers given after the initial intro turn
    const substantiveAnswersCount = Math.max(0, previousSubstantiveUserTurns - 1);
    const turnsPerPillar = options?.turnsPerPillarTarget ?? 2;

    // Check if candidate has completed all pillars
    if (substantiveAnswersCount >= totalPillars * turnsPerPillar) {
      return {
        action: "CONCLUDE_ROUND",
        reasonCode: "ALL_PILLARS_EXHAUSTED",
        targetPillarIndex: totalPillars - 1,
        targetPillarName: pillars[totalPillars - 1].name,
        consecutiveTurnsOnPillar: turnsPerPillar,
        isTerminalTurn: true,
        directiveInstruction:
          "All core pillars for this interview have been thoroughly explored. Give a brief, polite 1-sentence closing thank you and technical wrap-up. MANDATORY: You MUST append [SESSION_COMPLETED] at the very end. DO NOT ask any further questions.",
        groundingKeywords: ["conclude", "wrap up", "thank you"],
      };
    }

    const turnsPerCycle = turnsPerPillar + 1; // e.g. 3 turns per pillar: DrillDown (turn 1), Tradeoff (turn 2), Advance (turn 3)
    const calculatedPillarIndex = Math.min(
      Math.floor(substantiveAnswersCount / turnsPerCycle),
      totalPillars - 1
    );
    const turnsOnCurrentPillar = (substantiveAnswersCount % turnsPerCycle) + 1;
    const currentPillar = pillars[calculatedPillarIndex];

    // Check if policy indicates advancing to the next pillar
    if (turnsOnCurrentPillar > turnsPerPillar && calculatedPillarIndex < totalPillars - 1) {
      const nextPillar = pillars[calculatedPillarIndex + 1];
      return {
        action: "ADVANCE_PILLAR",
        reasonCode: "PILLAR_PROGRESSION_ADVANCE",
        targetPillarIndex: nextPillar.index,
        targetPillarName: nextPillar.name,
        consecutiveTurnsOnPillar: 0,
        isTerminalTurn: false,
        directiveInstruction: `The candidate has thoroughly discussed ${currentPillar.name}. Smoothly transition the conversation forward to Pillar ${nextPillar.index + 1}: ${nextPillar.name}. Ask a fresh architectural scenario probing ${nextPillar.description}.`,
        groundingKeywords: nextPillar.coreConcepts,
      };
    }

    // Substantive Turn 2 on same pillar: Challenge Tradeoff & Failure Modes
    if (turnsOnCurrentPillar === 2) {
      return {
        action: "CHALLENGE_TRADEOFF",
        reasonCode: "SUBSTANTIVE_CHALLENGE_TRADEOFF",
        targetPillarIndex: currentPillar.index,
        targetPillarName: currentPillar.name,
        consecutiveTurnsOnPillar: turnsOnCurrentPillar,
        isTerminalTurn: false,
        directiveInstruction: `The candidate provided their design for ${currentPillar.name}. Challenge constraints, failure scenarios, edge cases, or high-concurrency bottlenecks (e.g. 'What breaks first under heavy load?' or 'How do you handle partition recovery?').`,
        groundingKeywords: currentPillar.coreConcepts,
      };
    }

    // Substantive Turn 1 on pillar: Drill Down into Specifics
    return {
      action: "DRILL_DOWN",
      reasonCode: "SUBSTANTIVE_PROBE_DEPTH",
      targetPillarIndex: currentPillar.index,
      targetPillarName: currentPillar.name,
      consecutiveTurnsOnPillar: turnsOnCurrentPillar,
      isTerminalTurn: false,
      directiveInstruction: `The candidate provided a substantive answer on ${currentPillar.name}. Anchor to a specific tool, parameter, or concept they mentioned and probe deeper into the internal mechanics, trade-offs, or concrete trade-offs.`,
      groundingKeywords: currentPillar.coreConcepts,
    };
  }
}
