import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { getLLMProvider, LLMMessage, extractLLMErrorMessage } from "@/lib/llm";
import {
  buildOpeningPrompt,
  buildSystemPrompt,
  buildInterviewState,
  InterviewOrchestrator,
  SESSION_END_TOKEN,
} from "@/lib/interview/prompts";
import {
  QuestionDiversityService,
  validateCandidateQuestion,
  getDiverseFallbackQuestion,
} from "@/lib/interview/question-diversity";
import { EvaluationWorker } from "@/services/evaluation-worker";
import { ResponseAnalyzerService } from "@/services/response-analyzer";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const t0 = Date.now();
  try {
    const session = await getServerSession(authOptions);
    const tAuth = Date.now();

    if (!session?.user?.id && !session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { sessionId } = params;
    const body = await req.json().catch(() => ({}));
    const isOpening = Boolean(body.isOpening);
    const candidateMessage = body.message?.trim();
    const modality = body.modality === "VOICE" ? "VOICE" : "TEXT";
    const voiceTiming = body.timing;

    // Verify session existence and candidate ownership
    const interviewSession = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    const tDbLookup = Date.now();

    if (!interviewSession) {
      return new Response(
        JSON.stringify({ error: "Interview session not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (
      interviewSession.userId !== session.user.id &&
      interviewSession.user.email !== session.user.email
    ) {
      return new Response(
        JSON.stringify({ error: "Access to this interview session is forbidden." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (interviewSession.status !== "IN_PROGRESS") {
      return new Response(
        JSON.stringify({ error: "This interview session has already ended." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const llm = getLLMProvider();
    const encoder = new TextEncoder();

    // CASE 1: Initial Opening Question Stream
    if (isOpening || (interviewSession.messages.length === 0 && !candidateMessage)) {
      // If messages already exist, don't re-generate opening question
      if (interviewSession.messages.length > 0) {
        return new Response(
          JSON.stringify({ message: "Opening question already generated." }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Fetch cross-session history for the candidate to guarantee cross-session question diversity
      const crossSessionHistory = await QuestionDiversityService.getCrossSessionHistory(
        interviewSession.userId,
        interviewSession.type,
        interviewSession.domain
      );

      // Reconstruct InterviewState & Orchestrator Decision
      const interviewState = buildInterviewState({
        ...interviewSession,
        crossSessionAskedQuestions: crossSessionHistory.map((h) => h.questionText),
      });
      const orchestratorDecision = InterviewOrchestrator.decideNextStep({
        state: interviewState,
        isOpening: true,
      });

      const systemPrompt = buildSystemPrompt({
        state: interviewState,
        decision: orchestratorDecision,
      });
      const openingInstruction = buildOpeningPrompt({ state: interviewState });

      const customStream = new ReadableStream({
        async start(controller) {
          const tStreamStart = Date.now();
          let activeModel = "llama-3.3-70b-versatile";
          let activeProvider = "groq";

          try {
            // Pre-delivery generation with hard diversity validation
            let generatedText = await llm.generateText({
              messages: [{ role: "user", content: openingInstruction }],
              systemInstruction: systemPrompt,
              temperature: 0.5,
              maxOutputTokens: 200,
            });

            // Validate against past cross-session history
            let validation = validateCandidateQuestion(
              generatedText,
              crossSessionHistory,
              { targetPillarIndex: 0 }
            );

            if (!validation.isValid) {
              console.warn(
                `[Diversity Guardrail] Opening question collision: "${generatedText}" matched "${validation.collidedQuestion}". Reason: ${validation.reason}. Regenerating...`
              );
              const retryInstruction = `${openingInstruction}\n\nIMPORTANT: The candidate was already asked "${validation.collidedQuestion}". Introduce a fresh, distinct scenario focusing on ${validation.suggestedAlternativeArchetype || "a different technical context"}.`;
              try {
                const alternativeText = await llm.generateText({
                  messages: [{ role: "user", content: retryInstruction }],
                  systemInstruction: systemPrompt,
                  temperature: 0.7,
                  maxOutputTokens: 200,
                });
                const secondValidation = validateCandidateQuestion(
                  alternativeText,
                  crossSessionHistory,
                  { targetPillarIndex: 0 }
                );
                if (secondValidation.isValid) {
                  generatedText = alternativeText;
                } else {
                  generatedText = getDiverseFallbackQuestion(
                    0,
                    orchestratorDecision.targetPillarName,
                    interviewSession.domain
                  );
                }
              } catch (altErr) {
                generatedText = getDiverseFallbackQuestion(
                  0,
                  orchestratorDecision.targetPillarName,
                  interviewSession.domain
                );
              }
            }

            // Stream metadata event
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "meta",
                  provider: activeProvider,
                  model: activeModel,
                })}\n\n`
              )
            );

            // Clean text before streaming so internal tokens are NEVER sent over SSE
            const cleanOpeningText = generatedText
              .replace(/\[SESSION_COMPLETED\]/gi, "")
              .replace(/\[SESSION_COMPLETE\]/gi, "")
              .replace(/\[SESSION_END\]/gi, "")
              .replace(/\[INTERVIEW_COMPLETED\]/gi, "")
              .trim();

            // Stream tokens to candidate client
            const chunks = cleanOpeningText.match(/(\S+\s*)/g) || [cleanOpeningText];
            for (const chunk of chunks) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "token",
                    content: chunk,
                  })}\n\n`
                )
              );
              if (process.env.NODE_ENV !== "test") {
                await new Promise((r) => setTimeout(r, 10));
              }
            }

            const tStreamEnd = Date.now();

            // Save completed assistant opening question to DB
            if (cleanOpeningText.length > 0) {
              const savedMsg = await prisma.interviewMessage.create({
                data: {
                  sessionId,
                  role: "assistant",
                  content: cleanOpeningText,
                },
              });

              // Atomically record question into persistent QuestionHistory
              await QuestionDiversityService.recordQuestion({
                userId: interviewSession.userId,
                sessionId,
                questionText: cleanOpeningText,
                pillarIndex: 0,
                pillarSlug: "PILLAR-0",
                pillarName: orchestratorDecision.targetPillarName || "System Architecture",
                track: interviewSession.type,
                domain: interviewSession.domain,
                difficulty: interviewSession.difficulty,
                questionType: "OPENING",
              });

              const donePayload = `data: ${JSON.stringify({
                type: "done",
                messageId: savedMsg.id,
              })}\n\n`;
              controller.enqueue(encoder.encode(donePayload));
            }

            const tFinished = Date.now();
            console.log(`
┌────────────────────────────────────────────────────────────┐
│ ⏱️  [TIMING PROFILE: OPENING QUESTION STREAM]
├────────────────────────────────────────────────────────────┤
│ Active Provider & Model     : ${activeProvider} (${activeModel})
│ Orchestrator Action         : ${orchestratorDecision.action} (${orchestratorDecision.reasonCode})
│ 1. NextAuth Session Auth    : ${tAuth - t0}ms
│ 2. PostgreSQL Session Lookup: ${tDbLookup - tAuth}ms
│ 3. Question Generation/Check: ${tStreamEnd - tStreamStart}ms
│ 4. DB Message Insertion     : ${tFinished - tStreamEnd}ms
│ ──────────────────────────────────────────────────────────
│ TOTAL OPENING TURN DURATION : ${tFinished - t0}ms
└────────────────────────────────────────────────────────────┘
`);
            controller.close();
          } catch (err: any) {
            const detailedMsg = extractLLMErrorMessage(err);
            console.error("[Opening Streaming Error Details]:", detailedMsg, err);
            const errorPayload = `data: ${JSON.stringify({
              type: "error",
              message: detailedMsg || "Failed to generate opening question. Please refresh or retry.",
            })}\n\n`;
            controller.enqueue(encoder.encode(errorPayload));
            controller.close();
          }
        },
      });

      return new Response(customStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // CASE 2: Candidate Turn (Regular Conversation Turn)
    if (!candidateMessage) {
      return new Response(
        JSON.stringify({ error: "Message cannot be empty." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Retrieve cross-session question history for this candidate
    const crossSessionHistory = await QuestionDiversityService.getCrossSessionHistory(
      interviewSession.userId,
      interviewSession.type,
      interviewSession.domain
    );

    // Reconstruct complete InterviewState & determine next action via Orchestrator
    const interviewState = buildInterviewState(
      {
        ...interviewSession,
        crossSessionAskedQuestions: crossSessionHistory.map((h) => h.questionText),
      },
      candidateMessage
    );
    const orchestratorDecision = InterviewOrchestrator.decideNextStep({
      state: interviewState,
      candidateMessage,
    });

    const systemPrompt = buildSystemPrompt({
      state: interviewState,
      decision: orchestratorDecision,
    });
    const tPromptBuilt = Date.now();

    const pillarSlug = `PILLAR-${orchestratorDecision.targetPillarIndex}`;

    // Context snapshot for durable background evaluator
    const contextSnapshot = interviewSession.messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Transactional Outbox: Atomically increment turn counter, persist Candidate Message + EvaluationJob(PENDING)
    const tBeforeUserMsgSave = Date.now();
    let recordedTurnSequence = 1;
    try {
      await prisma.$transaction(async (tx) => {
        const updatedSession = await tx.interviewSession.update({
          where: { id: sessionId },
          data: { turnCounter: { increment: 1 } },
          select: { turnCounter: true },
        });

        recordedTurnSequence = updatedSession.turnCounter;
        const turnSequenceNumber = updatedSession.turnCounter;
        const idempotencyKey = EvaluationWorker.getJobIdempotencyKey(sessionId, turnSequenceNumber);

        await tx.interviewMessage.create({
          data: {
            sessionId,
            role: "user",
            content: candidateMessage,
          },
        });

        await tx.evaluationJob.create({
          data: {
            idempotencyKey,
            sessionId,
            turnSequenceNumber,
            pillarSlug,
            candidateMessage,
            contextHistory: contextSnapshot,
            status: "PENDING",
            maxRetries: 3,
            timeoutMs: 12000,
          },
        });
      });

      // Fire non-blocking asynchronous evaluation dispatch for this session
      EvaluationWorker.processAllPendingJobs({ sessionId, maxDurationMs: 8000, batchSize: 5 })
        .catch((err) => console.error("[Background Evaluation Trigger Error]:", err));
    } catch (txErr: any) {
      // Fallback: If evaluation job already exists or concurrency retry occurs,
      // ensure user message persists so conversation stream is never interrupted.
      console.warn("[Transactional Outbox Warning]:", txErr?.message);
      await prisma.interviewMessage.create({
        data: {
          sessionId,
          role: "user",
          content: candidateMessage,
        },
      }).catch(() => {});
    }

    // Response & Voice Analysis: Decoupled from critical turn transaction & non-blocking
    try {
      const responseAnalysis = ResponseAnalyzerService.analyzeResponse({
        sessionId,
        turnSequenceNumber: recordedTurnSequence,
        candidateMessage,
        modality,
        voiceTiming,
      });

      // Asynchronously persist analysis (failures do not impact interview flow or stream)
      ResponseAnalyzerService.persistAnalysis(responseAnalysis, prisma).catch((persistErr) => {
        console.warn("[Response Analysis Persistence Warning]:", persistErr?.message);
      });
    } catch (analysisErr: any) {
      console.warn("[Response Analysis Calculation Warning]:", analysisErr?.message);
    }
    const tAfterUserMsgSave = Date.now();

    // Construct full conversation history
    const historyMessages: LLMMessage[] = interviewSession.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // Append latest user message
    historyMessages.push({
      role: "user",
      content: candidateMessage,
    });

    // Create readable SSE stream
    const customStream = new ReadableStream({
      async start(controller) {
        const tStreamStart = Date.now();
        let activeModel = "llama-3.3-70b-versatile";
        let activeProvider = "groq";

        try {
          // Pre-delivery generation with hard diversity validation
          let generatedText = await llm.generateText({
            messages: historyMessages,
            systemInstruction: systemPrompt,
            temperature: 0.5,
            maxOutputTokens: 200,
          });

          // Check if assistant emitted structural session termination token
          const isSessionEnded =
            generatedText.includes(SESSION_END_TOKEN) ||
            orchestratorDecision.isTerminalTurn;

          // Hard Diversity & Anti-Repetition Validation (only for active questions, not session conclusion)
          if (!isSessionEnded) {
            const withinSessionQuestions = interviewSession.messages
              .filter((m) => m.role === "assistant")
              .map((m) => ({ questionText: m.content }));
            const allHistoricalQuestions = [
              ...withinSessionQuestions,
              ...crossSessionHistory,
            ];

            const isFollowUpAction =
              orchestratorDecision.action === "DRILL_DOWN" ||
              orchestratorDecision.action === "CHALLENGE_TRADEOFF";

            let validation = validateCandidateQuestion(
              generatedText,
              allHistoricalQuestions,
              {
                precedingCandidateAnswer: candidateMessage,
                isFollowUpAction,
                targetPillarIndex: orchestratorDecision.targetPillarIndex,
              }
            );

            if (!validation.isValid) {
              console.warn(
                `[Diversity Guardrail] Rejected candidate question due to ${validation.matchLevel}: "${generatedText}" collided with "${validation.collidedQuestion}". Reason: ${validation.reason}. Regenerating...`
              );

              const retryInstruction = `
The previous draft question was rejected because it duplicates or closely resembles a previously asked question: "${validation.collidedQuestion}".
Reason: ${validation.reason}
MANDATORY DIRECTIVE: You MUST generate a completely distinct, alternative question targeting the scenario archetype: "${validation.suggestedAlternativeArchetype}".
Ensure the new question tests Pillar ${orchestratorDecision.targetPillarIndex + 1} (${orchestratorDecision.targetPillarName}) with different technical components and failure modes.
`.trim();

              try {
                const retryMessages = [
                  ...historyMessages,
                  { role: "assistant" as const, content: generatedText },
                  { role: "user" as const, content: retryInstruction },
                ];

                const alternativeText = await llm.generateText({
                  messages: retryMessages,
                  systemInstruction: systemPrompt,
                  temperature: 0.7,
                  maxOutputTokens: 200,
                });

                const secondValidation = validateCandidateQuestion(
                  alternativeText,
                  allHistoricalQuestions,
                  {
                    precedingCandidateAnswer: candidateMessage,
                    isFollowUpAction,
                    targetPillarIndex: orchestratorDecision.targetPillarIndex,
                  }
                );

                if (secondValidation.isValid) {
                  generatedText = alternativeText;
                } else {
                  console.warn(
                    `[Diversity Guardrail] Secondary validation failed: "${alternativeText}". Applying deterministic archetype fallback...`
                  );
                  generatedText = getDiverseFallbackQuestion(
                    orchestratorDecision.targetPillarIndex,
                    orchestratorDecision.targetPillarName,
                    interviewSession.domain,
                    validation.suggestedAlternativeArchetype
                  );
                }
              } catch (retryErr) {
                console.warn("[Diversity Guardrail] Regeneration failed, applying fallback:", retryErr);
                generatedText = getDiverseFallbackQuestion(
                  orchestratorDecision.targetPillarIndex,
                  orchestratorDecision.targetPillarName,
                  interviewSession.domain,
                  validation.suggestedAlternativeArchetype
                );
              }
            }
          }

          // Stream metadata event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "meta",
                provider: activeProvider,
                model: activeModel,
              })}\n\n`
            )
          );

          // Clean text before streaming so internal tokens like [SESSION_COMPLETED] are NEVER sent over SSE
          const cleanAssistantText = generatedText
            .replace(/\[SESSION_COMPLETED\]/gi, "")
            .replace(/\[SESSION_COMPLETE\]/gi, "")
            .replace(/\[SESSION_END\]/gi, "")
            .replace(/\[INTERVIEW_COMPLETED\]/gi, "")
            .trim();

          // Stream tokens to candidate client
          const chunks = cleanAssistantText.match(/(\S+\s*)/g) || [cleanAssistantText];
          for (const chunk of chunks) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "token",
                  content: chunk,
                })}\n\n`
              )
            );
            if (process.env.NODE_ENV !== "test") {
              await new Promise((r) => setTimeout(r, 10));
            }
          }

          const tStreamEnd = Date.now();

          // Save completed assistant reply to database
          if (cleanAssistantText.length > 0) {
            const savedMsg = await prisma.interviewMessage.create({
              data: {
                sessionId,
                role: "assistant",
                content: cleanAssistantText,
              },
            });

            // Conclude session in DB if ended
            if (isSessionEnded) {
              await prisma.interviewSession.update({
                where: { id: sessionId },
                data: { status: "COMPLETED" },
              });
            } else {
              // Atomically record technical interview question to persistent QuestionHistory
              await QuestionDiversityService.recordQuestion({
                userId: interviewSession.userId,
                sessionId,
                questionText: cleanAssistantText,
                pillarIndex: orchestratorDecision.targetPillarIndex,
                pillarSlug,
                pillarName: orchestratorDecision.targetPillarName,
                track: interviewSession.type,
                domain: interviewSession.domain,
                difficulty: interviewSession.difficulty,
                questionType: orchestratorDecision.action,
              });
            }

            const donePayload = `data: ${JSON.stringify({
              type: "done",
              messageId: savedMsg.id,
              isSessionEnded,
            })}\n\n`;
            controller.enqueue(encoder.encode(donePayload));
          }

          const tFinished = Date.now();

          // Log high-resolution timing breakdown for regular candidate turn
          console.log(`
┌────────────────────────────────────────────────────────────┐
│ ⏱️  [TIMING PROFILE: REGULAR CANDIDATE TURN]
├────────────────────────────────────────────────────────────┤
│ Active Provider & Model     : ${activeProvider} (${activeModel})
│ Orchestrator Action         : ${orchestratorDecision.action} (${orchestratorDecision.reasonCode})
│ Target Pillar               : Pillar ${orchestratorDecision.targetPillarIndex + 1} (${orchestratorDecision.targetPillarName})
│ 1. NextAuth Session Auth    : ${tAuth - t0}ms
│ 2. PostgreSQL Session Lookup: ${tDbLookup - tAuth}ms
│ 3. User Message DB Save     : ${tAfterUserMsgSave - tBeforeUserMsgSave}ms
│ 4. Prompt & Orchestration   : ${tPromptBuilt - tDbLookup}ms
│ 5. Generation & Diversity   : ${tStreamEnd - tStreamStart}ms
│ 6. DB Message Insertion     : ${tFinished - tStreamEnd}ms
│ ──────────────────────────────────────────────────────────
│ TOTAL REGULAR TURN DURATION : ${tFinished - t0}ms
└────────────────────────────────────────────────────────────┘
`);

          controller.close();
        } catch (err: any) {
          const detailedMsg = extractLLMErrorMessage(err);
          console.error("[Interview Streaming Error Details]:", detailedMsg, err);
          const errorPayload = `data: ${JSON.stringify({
            type: "error",
            message: detailedMsg || "An error occurred while generating the response. Please try sending your answer again.",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorPayload));
          controller.close();
        }
      },
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("[Stream Route Error]:", err);
    return new Response(
      JSON.stringify({ error: "Failed to initiate streaming response." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
