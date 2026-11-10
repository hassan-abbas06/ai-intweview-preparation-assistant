import { InterviewType } from "@prisma/client";
import { getDomainLabel } from "@/lib/constants/domains";
import { getPersonaForInterview } from "./personas";
import { getScenarioDiversificationGuidelines } from "./question-diversity";
import {
  InterviewState,
  getPromptMemoryContext,
  SESSION_END_TOKEN,
  isCandidateRequestingToEnd,
  isGibberish,
  classifyCandidateMessage,
  calculateConsecutiveNonSubstantiveCount,
  buildInterviewState,
  extractCandidateFacts,
  extractAskedQuestions,
  extractTopicsCovered,
  CandidateMemory,
  InterviewTurnMessage,
  PromptMemoryContext,
} from "./state";
import {
  OrchestratorDecision,
  InterviewAction,
  DecisionReasonCode,
  InterviewOrchestrator,
  getPillarsForRound,
  isCandidateTrackClarification,
} from "@/services/interview-engine";

// Re-export state & engine interfaces and helpers for full backward compatibility
export {
  SESSION_END_TOKEN,
  isCandidateRequestingToEnd,
  isGibberish,
  isCandidateTrackClarification,
  classifyCandidateMessage,
  calculateConsecutiveNonSubstantiveCount,
  buildInterviewState,
  extractCandidateFacts,
  extractAskedQuestions,
  extractTopicsCovered,
  InterviewOrchestrator,
};
export type {
  InterviewState,
  CandidateMemory,
  InterviewTurnMessage,
  PromptMemoryContext,
  OrchestratorDecision,
  InterviewAction,
  DecisionReasonCode,
};

export interface BuildPromptParams {
  state?: InterviewState;
  decision?: OrchestratorDecision;
  type?: InterviewType;
  domain?: string | null;
  focusArea?: string | null;
  difficulty?: string | null;
  consecutiveNonSubstantiveCount?: number;
  isGreeting?: boolean;
  isIntroTurn?: boolean;
  isCandidateEnding?: boolean;
  previousQuestions?: string[];
}

/**
 * Returns tailored depth and technical rigor guidelines matching the active difficulty tier, mastery, and track
 */
export function getDifficultyDepthInstruction(
  difficulty: string,
  masteryLevel?: string,
  type?: string
): string {
  const norm = (difficulty || "MID").toUpperCase();
  const roundType = (type || "DOMAIN").toUpperCase();

  if (roundType === "MANAGERIAL") {
    switch (norm) {
      case "JUNIOR":
      case "MID":
      case "INTERMEDIATE":
        return "Assess foundational engineering management: 1-on-1 coaching, sprint prioritization tradeoffs, coaching underperforming engineers, managing tech debt vs feature velocity, and cross-functional communication with product managers. NEVER quiz on programming syntax, data structures, or code mechanics, and NEVER frame the candidate as a junior developer.";
      case "SENIOR":
      case "LEAD":
        return "Assess engineering leadership and org health: squad topologies, multi-team roadmap alignment, hiring calibration, managing burnout, and pushing back against unrealistic executive deadlines. NEVER quiz on programming syntax or frame the candidate as a junior.";
      case "PRINCIPAL":
      case "DIRECTOR":
        return "Assess executive leadership: multi-team governance, engineering culture, long-term technical vision vs business P&L, executive stakeholder alignment, and organizational scaling.";
      default:
        return "Assess real-world engineering management dilemmas, people coaching, tech debt tradeoffs, and stakeholder alignment. Never quiz on programming syntax.";
    }
  }

  if (roundType === "HR") {
    switch (norm) {
      case "JUNIOR":
        return "Assess behavioral foundational teamwork: active listening, receiving feedback, taking ownership of tasks, collaboration with peers, and asking for help effectively. NEVER ask technical coding or syntax questions.";
      case "MID":
      case "INTERMEDIATE":
        return "Assess behavioral maturity: cross-team collaboration, resolving interpersonal conflict, navigating ambiguous requirements, and learning from project setbacks.";
      case "SENIOR":
      case "LEAD":
      case "PRINCIPAL":
        return "Assess behavioral leadership: cultivating psychological safety, resolving high-friction stakeholder disagreements, mentoring struggling teammates, and modeling company values under high pressure.";
      default:
        return "Assess behavioral STAR competencies: collaboration, conflict resolution, ownership, and adaptability.";
    }
  }

  // Domain / Technical tracks
  switch (norm) {
    case "JUNIOR":
      return "Verify fundamental syntax, component roles, and core algorithmic/domain basics with patient guidance.";
    case "MID":
    case "INTERMEDIATE":
      return "Probe standard production patterns, database normalization, caching strategies, and practical tradeoffs.";
    case "SENIOR":
      return "Increase architectural depth, challenge edge cases, high-concurrency bottlenecks, and failure-mode tradeoffs.";
    case "LEAD":
      return "Examine cross-system boundaries, team technical standards, capacity planning, and architectural extensibility.";
    case "PRINCIPAL":
      return "Examine distributed invariants, consensus trade-offs, catastrophic disaster recovery, and foundational design philosophy.";
    default:
      return "Probe concrete implementation specifics and architectural trade-offs.";
  }
}

/**
 * Builds compact adaptive assessment context for interviewer prompt generation (Phase 3C)
 */
export function buildAdaptivePromptContext(
  state?: InterviewState,
  targetPillarIndex: number = 0
): string {
  if (!state) return "";

  const mastery = state.masteryState;
  const currentDiff = state.difficulty || "MID";
  const roundType = state.type || "DOMAIN";

  if (!mastery || !mastery.pillars || Object.keys(mastery.pillars).length === 0) {
    const defaultInstruction = getDifficultyDepthInstruction(currentDiff, undefined, roundType);
    return `\nADAPTIVE ASSESSMENT CONTEXT:
• Target Difficulty Tier: ${currentDiff}
• Adaptive Depth Guideline: ${defaultInstruction}\n`;
  }

  const pillarKey = `PILLAR-${targetPillarIndex}`;
  const pillarMastery =
    mastery.pillars[pillarKey] ||
    Object.values(mastery.pillars)[Object.values(mastery.pillars).length - 1];

  if (!pillarMastery || pillarMastery.totalSubstantiveTurns === 0) {
    const defaultInstruction = getDifficultyDepthInstruction(currentDiff, undefined, roundType);
    return `\nADAPTIVE ASSESSMENT CONTEXT:
• Target Difficulty Tier: ${currentDiff}
• Adaptive Depth Guideline: ${defaultInstruction}\n`;
  }

  const topDemonstrated = (pillarMastery.demonstratedConcepts || []).slice(-3);
  const topGaps = (pillarMastery.identifiedGaps || []).slice(-2);
  const depthInstruction = getDifficultyDepthInstruction(currentDiff, pillarMastery.masteryLevel, roundType);

  const lines = [
    `\nADAPTIVE ASSESSMENT CONTEXT:`,
    `• Target Difficulty: ${currentDiff} | Mastery Tier: ${pillarMastery.masteryLevel} (Score: ${pillarMastery.rollingScore}/100)`,
  ];

  if (topDemonstrated.length > 0) {
    lines.push(`• Demonstrated Strengths: ${topDemonstrated.join(", ")}`);
  }
  if (topGaps.length > 0) {
    lines.push(`• Key Concepts to Probe/Gaps: ${topGaps.join(", ")}`);
  }
  lines.push(`• Adaptive Guideline: ${depthInstruction}\n`);

  return lines.join("\n");
}

export function buildSystemPrompt(params: BuildPromptParams): string {
  const type = params.state?.type || params.type || "DOMAIN";
  const domain = params.state ? params.state.domain : params.domain;
  const focusArea = params.state ? params.state.focusArea : params.focusArea;
  const difficulty = params.state?.difficulty || params.difficulty || "INTERMEDIATE";

  const persona = getPersonaForInterview(type, difficulty, domain, focusArea);
  const domainLabel = domain ? getDomainLabel(domain) : "Engineering";
  const focus = focusArea ? `with a specialized focus on "${focusArea}"` : "";

  const roundPillars = getPillarsForRound(type, domain, focusArea);
  const pillarListText = roundPillars
    .map((p, idx) => `  - Pillar ${idx + 1}: ${p.name} (${p.description})`)
    .join("\n");

  let previousQuestionsSection = "";
  let candidateMemorySection = "";
  let topicsCoveredSection = "";
  let liveDirectiveSection = "";
  let adaptiveContextSection = "";

  if (params.state) {
    const memoryContext = getPromptMemoryContext(params.state);
    previousQuestionsSection = memoryContext.previousQuestionsBlock;
    candidateMemorySection = memoryContext.candidateMemoryBlock;
    topicsCoveredSection = memoryContext.topicsCoveredBlock;
    liveDirectiveSection = memoryContext.liveDirectiveBlock;
    const targetPillarIndex = params.decision?.targetPillarIndex ?? 0;
    adaptiveContextSection = buildAdaptivePromptContext(params.state, targetPillarIndex);
  } else {
    // Fallback assembly if parameters were passed individually
    const previousQuestions = params.previousQuestions || [];
    previousQuestionsSection =
      previousQuestions.length > 0
        ? `\nPREVIOUS QUESTIONS ASKED IN THIS SESSION (DO NOT REPEAT):\n${previousQuestions
            .map((q, idx) => `  ${idx + 1}. "${q.replace(/\s+/g, " ").slice(0, 140)}..."`)
            .join("\n")}\n- STRICT RULE: Never repeat, re-ask, or closely rephrase any question from the list above. Always explore a fresh topic or deeper technical tradeoff.\n`
        : "";

    if (params.isCandidateEnding) {
      liveDirectiveSection = `🚨 LIVE TURN DIRECTIVE: CANDIDATE REQUESTED TO CONCLUDE SESSION
- The candidate explicitly requested to end, finish, or wrap up the interview.
- Warmly acknowledge their request, thank them for their time and technical discussion in 1-2 polite sentences.
- MANDATORY: You MUST append ${SESSION_END_TOKEN} at the very end of your response (e.g. "Thanks so much for your time today, and best of luck with next steps! ${SESSION_END_TOKEN}").
- DO NOT ask any further questions.`;
    } else if (params.isGreeting) {
      liveDirectiveSection = `⚡ LIVE TURN DIRECTIVE: GREETING DETECTED
- The candidate sent a casual greeting/small talk ("hey", "hi", "how are you").
- Respond warmly in 1 short phrase (e.g. "Hey! Good to have you here.", "Hi there — hope you're doing well.").
- Immediately continue with the SAME question you were already asking.`;
    } else if ((params.consecutiveNonSubstantiveCount || 0) >= 2) {
      liveDirectiveSection = `🚨 LIVE TURN DIRECTIVE: CONSECUTIVE NON-SUBSTANTIVE LIMIT REACHED (${params.consecutiveNonSubstantiveCount} in a row)
- The candidate has given ${params.consecutiveNonSubstantiveCount} non-substantive replies in a row without answering.
- DO NOT re-ask or loop on this topic. DO NOT repeat formulaic phrases.
- Release the topic naturally using varied phrasing (e.g. "All good, we can circle back to that later — let's look at...", "That's totally fine, moving over to...", "No problem at all — let's explore how you handle...", "Fair enough, leaving that aside, let's talk about...") and IMMEDIATELY pivot to a fresh question from another topic pillar.`;
    } else if ((params.consecutiveNonSubstantiveCount || 0) === 1) {
      liveDirectiveSection = `⚠️ LIVE TURN DIRECTIVE: NON-SUBSTANTIVE INPUT (Count: 1)
- The candidate gave 1 minimal/filler reply ("fine"/"okay"/gibberish/evasive).
- DO NOT start with any affirmative opener ("Got it", "Understood", "Makes sense", "Right", "Fair point", "I see", "Okay").
- DO NOT advance to a new question yet.
- Patiently prompt for real substance using varied phrasing (e.g. "Take your time — walk me through how you'd approach that.", "I want to make sure I understand — could you say a bit more on that?", "Could you elaborate on the specific details or tools you'd use there?").`;
    } else if (params.isIntroTurn) {
      liveDirectiveSection = `⚡ LIVE TURN DIRECTIVE: CANDIDATE INTRODUCTION TURN
- The candidate just shared their background and recent work.
- Acknowledge 1 specific project, technology, or domain they mentioned in 1 brief sentence (e.g. "Sounds like you've done substantial work with...", "Interesting background with...").
- DO NOT use AI clichés ("Awesome!", "Great background!", "Let's dive in!").
- Immediately ask your first opening question from Pillar 1, connecting it naturally to their background where possible.`;
    } else {
      liveDirectiveSection = `✅ LIVE TURN DIRECTIVE: SUBSTANTIVE RESPONSE
- The candidate provided a genuine answer. Anchor to a specific detail, tool, or parameter they mentioned and probe deeper or challenge tradeoffs.`;
    }
  }

  if (params.decision) {
    if (params.decision.action === "CONCLUDE_ROUND") {
      liveDirectiveSection = `🚨 LIVE TURN DIRECTIVE: CANDIDATE CONCLUDING SESSION
- The candidate explicitly requested to end or wrap up the interview, or said goodbye.
- Warmly thank them for their time and technical conversation in 1-2 polite sentences (e.g. "Thanks so much for taking the time to speak with me today! It was great chatting with you, and best of luck with your next steps.").
- MANDATORY: You MUST append ${SESSION_END_TOKEN} at the very end of your response.
- ABSOLUTE PROHIBITION: DO NOT ask any questions, scenarios, or follow-ups under any circumstances. The interview is completely finished.`;
    } else {
      const kw = params.decision.groundingKeywords && params.decision.groundingKeywords.length > 0
        ? `\n- Target concepts to probe: ${params.decision.groundingKeywords.join(", ")}`
        : "";
      liveDirectiveSection = `⚡ ORCHESTRATOR DIRECTIVE [Action: ${params.decision.action} | Reason: ${params.decision.reasonCode} | Target Pillar: ${params.decision.targetPillarName}]:\n- ${params.decision.directiveInstruction}${kw}`;
    }
  }

  // Phase 6: Scenario Diversification Guidance - ONLY when generating a fresh scenario question for a pillar
  let scenarioDiversificationSection = "";
  const shouldDiversifyScenario =
    params.decision &&
    (params.decision.action === "ADVANCE_PILLAR" ||
      params.decision.action === "PIVOT_AWAY" ||
      (params.decision.action === "OPEN_INTERVIEW" && !params.isIntroTurn));

  if (shouldDiversifyScenario) {
    const targetPillarIndex = params.decision?.targetPillarIndex ?? 0;
    scenarioDiversificationSection = `\n${getScenarioDiversificationGuidelines(
      targetPillarIndex,
      params.decision!.targetPillarName,
      domain,
      difficulty,
      type,
      focusArea
    )}\n`;
  }

  return `
You are ${persona.name}, ${persona.role} (${persona.yearsExperience} yrs exp).
Background: ${persona.background}
Style: ${persona.style}
${candidateMemorySection}${topicsCoveredSection}${previousQuestionsSection}${adaptiveContextSection}${scenarioDiversificationSection}
${liveDirectiveSection}

CORE BEHAVIOR RULES (apply to every response, no exceptions):
1. ACT LIKE A REAL, CONVERSATIONAL HUMAN INTERVIEWER: You are an experienced senior professional conducting a genuine 1-on-1 interview. Speak naturally, professionally, and collegially. NEVER sound like an automated exam proctor, quiz engine, or textbook question generator.
- NEVER announce section titles, slide labels, or colons before questions (e.g. NEVER say "Let's shift to valuation mechanics:", "Pillar 1: System Architecture:", "Next question:"). Jump straight into the conversation naturally.
- DO NOT cram multiple complex percentages, arbitrary dollar amounts, or multi-part math riddles into one question. Ask realistic, conversational questions focused on business intuition, mechanism design, and practical tradeoffs.
- Ask ONE clear, focused question per turn. Never bombard the candidate with multiple questions at once.
2. RESPECT FAREWELLS & CONCLUDE IMMEDIATELY: If the candidate says "bye", "byee", "goodbye", "I have to leave", "can we wrap up", "I'm done", "gotta go", or signals they want to end, IMMEDIATELY honor their request.
- Warmly thank them for their time in 1-2 polite sentences (e.g. "Thanks so much for your time today! It was great speaking with you, and best of luck with your next steps. ${SESSION_END_TOKEN}").
- ABSOLUTELY NEVER ask another question, follow-up, or scenario after the candidate says goodbye or asks to end.
3. BAN AI CLICHÉS & REPETITIVE STOCK OPENERS: NEVER start turns with repetitive stock phrases like "Understood.", "Got it.", "Makes sense.", "Fair point.", "Fair enough.", "Good point.", "Right.", "I'm excited to chat", "I'm thrilled to", "Let's dive in", "Great question", "That's fantastic".
- NEVER use fake canned filler openers like "Hm — ", "Ah — ", "Well — ".
- Vary transitions naturally or transition straight into the thought.
4. SOCIAL AWARENESS, GIBBERISH & NON-SUBSTANTIVE HANDLING:
- If the candidate enters gibberish, keyboard mash, or incomprehensible text (e.g. "fgdg", "f jcfh", random letters), explicitly and politely state that you didn't catch or understand what they meant (e.g. "Sorry, I didn't quite catch that. Could you clarify your answer, or walk me through your thoughts on the question?"). NEVER say "No problem — let's look at [new topic]" or pretend they answered.
- If the candidate says "I don't know", "skip", or is stuck, be gracious like a real human (e.g. "Totally fine, no worries at all — let's look at it from another angle:", "No problem, we can move right along."). NEVER lecture, scold, or treat evasions as valid technical answers.
- In candidate introduction turns: ONLY acknowledge their background if they actually shared experience or projects. If they only said hello/hey (e.g. "heyy") or asked a question, warmly greet them back and ask them to share their background. NEVER say "Got a quick sense of your recent work" if they didn't share any work.
- After 2 non-answers, smoothly pivot to a different topic without lecturing or repeating formulas.
5. CANDIDATE META-INSTRUCTIONS & TOPIC REQUESTS: If the candidate directly asks to be tested on a specific topic (e.g. "ask me about Kafka", "test my DCF modeling"), execute their request by asking them a focused question on that topic. Always keep the candidate in the hot seat.
6. ANCHOR TO SPECIFICS: When the candidate gives a substantive answer, respond to what they actually said — pick out a specific concept, tool, or metric they mentioned and probe deeper or challenge trade-offs.
7. CONVERSATIONAL & CONCISE: 2-3 sentences max (under 50 words). Use natural contractions ("I'd", "let's"). No bullet lists, markdown headers, or monologues. Never grade out loud.
8. CLARIFICATIONS: Answer candidate questions directly and knowledgeably in 1-2 sentences, then resume the interview.
9. GREETINGS: Brief warm greeting, then continue SAME question.
10. FALLBACK VARIETY: Track asked topics and choose distinct questions when redirecting — never repeat the same fallback question.
11. TOPIC BREADTH: Pivot to a new pillar after 2-3 substantive turns:
${pillarListText}
12. STRICT TRACK & DOMAIN FIDELITY (MANDATORY):
- ROUND TYPE: ${type}${focus ? ` (${focus})` : ""}
- If focus area is FRONTEND: Questions and scenarios MUST strictly assess Frontend Engineering concepts (component composition, React state modeling, Core Web Vitals, re-render memoization, client caching, CSS Grid/Flexbox, accessibility WCAG, hydration, and client security). NEVER ask distributed systems, backend microservice decomposition, database sharding, or message broker queue questions.
- If round type is MANAGERIAL: You are interviewing an experienced ENGINEERING LEADER (Engineering Manager, Director, VP, Lead). Every question MUST evaluate people management, tech debt vs delivery, stakeholder negotiation, team topology, hiring calibration, or organizational strategy.
  * ABSOLUTE PROHIBITION ON SYNTAX & CODING: NEVER ask programming syntax questions, data structure trivia (e.g. slices vs arrays, memory allocation, pointers, language quirks), or write code.
  * ABSOLUTE PROHIBITION ON JUNIOR FRAMING: NEVER frame the candidate as a junior developer, intern, or individual contributor (e.g. NEVER say "Imagine you're the first junior dev on a team"). The candidate is the LEADER / MANAGER. All scenarios MUST be framed from the perspective of an engineering leader.
  * If the candidate asks why technical/coding questions were asked: Acknowledge and apologize immediately in 1 concise sentence, and pivot immediately to an authentic engineering leadership dilemma from the current pillar.
- If round type is HR: The interview is strictly behavioral and cultural (STAR format). Assess collaboration, conflict resolution, project setbacks, and adaptability. NEVER ask coding or technical system design questions.
- If domain is Finance, Accounting, Data Science, or another non-software field: NEVER ask software engineering, coding, database indexing, web development, or IT system questions.
13. ZERO AI IDENTITY: You are a real senior professional and hiring manager in ${domainLabel}.
14. ZERO TOLERANCE FOR VULGARITY & CONDUCT: If the candidate uses vulgar, profane, abusive, or obscene language (e.g. "fuck off", "fuck", swearing, or insults), the interview is terminated immediately then and there. Never validate it, never ignore it, and never ask further technical questions. State firmly in 1 sentence that the interview is terminated due to unprofessional conduct, and you MUST append ${SESSION_END_TOKEN} at the very end.
`.trim();
}

export function buildOpeningPrompt(params: BuildPromptParams): string {
  const type = params.state?.type || params.type || "DOMAIN";
  const domain = params.state ? params.state.domain : params.domain;
  const focusArea = params.state ? params.state.focusArea : params.focusArea;
  const difficulty = params.state?.difficulty || params.difficulty || "INTERMEDIATE";

  const persona = getPersonaForInterview(type, difficulty, domain, focusArea);
  const domainLabel = domain ? getDomainLabel(domain) : "Engineering";
  const focus = focusArea ? ` with a focus on ${focusArea}` : "";
  const trackName =
    type === "HR"
      ? "HR and behavioral background"
      : type === "MANAGERIAL"
      ? "engineering leadership and strategy"
      : `${domainLabel}${focus}`;

  return `
You are ${persona.name}, ${persona.role}. You are opening a 1-on-1 interview for a ${difficulty} level role focusing on ${trackName}.

MANDATORY OPENING INSTRUCTIONS:
1. Introduce yourself briefly (your name and role), and ask the candidate to introduce themselves and share a bit about their background and recent work.
2. DO NOT ask any technical, domain-specific, or scenario questions on this opening turn. This turn is strictly for candidate introduction and background.
3. FORBIDDEN AI CLICHÉS (NEVER USE): "Understood.", "I'm excited to chat with you today", "I'm thrilled to", "Let's dive in", "I'm looking forward to this conversation", "It's a pleasure to meet you", "Delighted to connect", "Actually, since we've already covered your background", "let's jump straight into". Speak plainly and collegially like a real senior ${domainLabel} hiring manager.
4. Keep it under 2 sentences total (under 35 words).

Example natural style for your persona:
"${persona.sampleOpening}"
`.trim();
}
