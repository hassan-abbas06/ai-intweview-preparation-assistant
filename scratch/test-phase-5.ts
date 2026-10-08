import {
  VoiceStateMachine,
  TurnSubmissionDecision,
} from "../lib/voice/state-machine";
import {
  calculateAudioRMS,
  VADLogicTracker,
  VoiceActivityDetector,
} from "../lib/voice/vad";
import { SpeechToTextEngine } from "../lib/voice/stt";
import { TextToSpeechEngine, cleanTextForSpeech } from "../lib/voice/tts";
import { VoiceState, VoiceError } from "../lib/voice/types";
import {
  buildInterviewState,
  classifyCandidateMessage,
  InterviewState,
} from "../lib/interview/state";
import {
  InterviewOrchestrator,
  TECHNICAL_PILLARS,
} from "../services/interview-engine";
import { buildSystemPrompt } from "../lib/interview/prompts";
import { InterviewType, SessionStatus, InterviewModality } from "@prisma/client";

// ANSI colors for clean test reporting
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`${GREEN}  ✓ PASS:${RESET} ${testName}`);
    passedCount++;
  } else {
    console.error(`${RED}  ✗ FAIL:${RESET} ${testName}`);
    if (detail) console.error(`    ${YELLOW}Detail:${RESET} ${detail}`);
    failedCount++;
  }
}

async function runPhase5Tests() {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 5: ADVANCED VOICE INTERACTION TEST SUITE   ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}\n`);

  // ==========================================================================
  // SECTION 1: Pure Audio Math & VAD Logic Tracker
  // ==========================================================================
  console.log(`${YELLOW}--- Audio RMS & VAD Signal Processing Tests ---${RESET}`);

  // Test RMS with silence
  const silenceBuffer = new Float32Array(512);
  assert(calculateAudioRMS(silenceBuffer) === 0, "calculateAudioRMS returns 0 for silence buffer");

  // Test RMS with empty/null
  assert(calculateAudioRMS([]) === 0, "calculateAudioRMS gracefully handles empty array");
  assert(calculateAudioRMS(new Float32Array(0)) === 0, "calculateAudioRMS handles 0-length Float32Array");

  // Test RMS with DC constant
  const dcBuffer = new Float32Array(512).fill(0.5);
  const dcRms = calculateAudioRMS(dcBuffer);
  assert(Math.abs(dcRms - 0.5) < 0.0001, `calculateAudioRMS accurately computes DC signal (got ${dcRms})`);

  // Test VAD Logic Tracker - speech start detection with delay debounce
  const tracker = new VADLogicTracker({
    speechStartThreshold: 0.025,
    speechStartDelayMs: 120,
    silenceDelayMs: 1600,
    minSpeechDurationMs: 300,
  });

  let t = 1000;
  // 1. Quiet noise below threshold -> IDLE
  assert(tracker.evaluateFrame(0.01, t) === "IDLE", "VAD evaluates background noise (< threshold) as IDLE");

  // 2. High energy frame starts timer, but delay not reached yet -> IDLE
  t += 50; // t = 1050 (timer initialized)
  assert(tracker.evaluateFrame(0.08, t) === "IDLE", "VAD debounces initial loud frame (< speechStartDelayMs)");

  // 3. High energy sustained past 120ms -> SPEECH_START
  t += 150; // t = 1200 (150ms elapsed >= 120ms)
  assert(tracker.evaluateFrame(0.08, t) === "SPEECH_START", "VAD triggers SPEECH_START once speechStartDelayMs elapsed");
  assert(tracker.getIsSpeaking() === true, "VAD tracker confirms isSpeaking is true");

  // 4. Continued speech -> SPEECH_CONTINUE
  t += 200; // total 350ms of speech
  assert(tracker.evaluateFrame(0.07, t) === "SPEECH_CONTINUE", "VAD reports SPEECH_CONTINUE during candidate utterance");

  // 5. Brief speech pause (< 1600ms) -> PAUSE_STARTED
  t += 100;
  assert(tracker.evaluateFrame(0.005, t) === "PAUSE_STARTED", "VAD reports PAUSE_STARTED on voice silence");

  // 6. Speech resumes during pause before silence timeout -> SPEECH_CONTINUE
  t += 300;
  assert(tracker.evaluateFrame(0.06, t) === "SPEECH_CONTINUE", "VAD resumes SPEECH_CONTINUE if candidate resumes before silence timeout");

  // 7. Sustained silence exceeding 1600ms -> END_OF_TURN
  t += 100;
  tracker.evaluateFrame(0.005, t); // pause start
  t += 1700; // silence elapsed > 1600ms, and total speech was > 300ms
  assert(tracker.evaluateFrame(0.005, t) === "END_OF_TURN", "VAD triggers END_OF_TURN when silence threshold elapses");
  assert(tracker.getIsSpeaking() === false, "VAD tracker marks isSpeaking as false after END_OF_TURN");

  // 8. Subsequent silence frames do NOT trigger duplicate END_OF_TURN
  t += 100;
  assert(tracker.evaluateFrame(0.005, t) === "IDLE", "VAD returns IDLE on subsequent silence frames (prevents duplicate turn end)");

  // 9. Very short transient pop (< minSpeechDurationMs) -> discarded as IDLE
  tracker.reset();
  t += 500;
  tracker.evaluateFrame(0.1, t); // t = 0ms of pop
  t += 130;
  tracker.evaluateFrame(0.1, t); // triggers SPEECH_START at 130ms
  t += 20; // total speech only 150ms (< 300ms min)
  tracker.evaluateFrame(0.005, t); // silence begins
  t += 1700; // silence timeout elapses
  assert(tracker.evaluateFrame(0.005, t) === "IDLE", "VAD discards brief audio glitches (< minSpeechDurationMs) as IDLE instead of turn");

  // ==========================================================================
  // SECTION 2: Voice State Machine Valid Transitions (Items 1 - 6)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Voice State Machine Core Transitions (Items 1-6) ---${RESET}`);

  const sm = new VoiceStateMachine("IDLE");
  assert(sm.getState() === "IDLE", "State machine initializes to IDLE");

  // Item 1: IDLE -> LISTENING
  assert(sm.transition("LISTENING"), "Item 1: Successfully transitions IDLE -> LISTENING");
  assert(sm.getState() === "LISTENING", "State is confirmed as LISTENING");

  // Invalid transition check: LISTENING cannot jump directly to AI_SPEAKING without PROCESSING
  assert(!sm.transition("AI_SPEAKING"), "State machine strictly rejects invalid transition LISTENING -> AI_SPEAKING");

  // Item 2: LISTENING -> PROCESSING
  assert(sm.transition("PROCESSING"), "Item 2: Successfully transitions LISTENING -> PROCESSING");
  assert(sm.getState() === "PROCESSING", "State is confirmed as PROCESSING");

  // Item 3: PROCESSING -> AI_SPEAKING
  assert(sm.handleTTSStart(), "Item 3: Successfully transitions PROCESSING -> AI_SPEAKING via handleTTSStart()");
  assert(sm.getState() === "AI_SPEAKING", "State is confirmed as AI_SPEAKING");

  // Item 4: AI_SPEAKING -> LISTENING
  assert(sm.handleTTSEnd(), "Item 4: Successfully transitions AI_SPEAKING -> LISTENING on natural TTS completion");
  assert(sm.getState() === "LISTENING", "State is confirmed as LISTENING after AI finish");

  // Item 5: AI_SPEAKING -> INTERRUPTED (Barge-in)
  sm.transition("PROCESSING");
  sm.handleTTSStart();
  assert(sm.getState() === "AI_SPEAKING", "State set to AI_SPEAKING before barge-in test");
  const bargeInResult = sm.handleSpeechStart();
  assert(bargeInResult.interrupted === true, "Item 5: handleSpeechStart() flags interrupted = true during AI_SPEAKING");

  // Item 6: INTERRUPTED -> LISTENING
  assert(sm.getState() === "LISTENING", "Item 6: Barge-in automatically moves machine through INTERRUPTED to LISTENING");

  // ==========================================================================
  // SECTION 3: Turn Submission Guard & Deduplication (Items 7 - 11)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Turn Submission & Deduplication (Items 7-11) ---${RESET}`);

  // Item 7: Empty transcript rejected
  const emptyRes1 = sm.evaluateTurnSubmission("");
  assert(!emptyRes1.shouldSubmit && emptyRes1.reason === "EMPTY_TRANSCRIPT", "Item 7: Empty string rejected with EMPTY_TRANSCRIPT");
  const emptyRes2 = sm.evaluateTurnSubmission("   \t  \n  ");
  assert(!emptyRes2.shouldSubmit && emptyRes2.reason === "EMPTY_TRANSCRIPT", "Item 7: Whitespace-only string rejected with EMPTY_TRANSCRIPT");

  // Item 8: Final transcript submitted exactly once
  const validTurn = sm.evaluateTurnSubmission("We use Redis for caching and PostgreSQL for relational persistence.");
  assert(validTurn.shouldSubmit === true, "Item 8: Valid candidate transcript accepted for submission");
  assert(validTurn.turnId.startsWith("voice_turn_"), "Item 8: Generates unique turnId for backend synchronization");
  assert(sm.getState() === "PROCESSING", "Item 8: State immediately transitions to PROCESSING upon turn acceptance");

  // Item 9: Duplicate final transcript ignored (debounced)
  // Reset turn submission in-flight flag to test transcript deduplication specifically
  sm.finishTurnSubmission();
  sm.transition("LISTENING");
  const dupRes = sm.evaluateTurnSubmission("We use Redis for caching and PostgreSQL for relational persistence.");
  assert(!dupRes.shouldSubmit && dupRes.reason === "DUPLICATE_TRANSCRIPT_DEBOUNCED", "Item 9: Duplicate identical transcript debounced within 3000ms");

  // Item 10: End-of-turn triggers exactly one submission (Submission in progress guard)
  const firstSubmission = sm.evaluateTurnSubmission("This is a fresh candidate response about Docker containers.");
  assert(firstSubmission.shouldSubmit === true, "Item 10: Fresh response submitted successfully");
  const concurrentSubmission = sm.evaluateTurnSubmission("Another utterance while first is in-flight");
  assert(
    !concurrentSubmission.shouldSubmit && concurrentSubmission.reason === "SUBMISSION_IN_PROGRESS",
    "Item 10: Concurrent turn submission rejected with SUBMISSION_IN_PROGRESS"
  );
  sm.finishTurnSubmission();

  // Item 11: VAD timeout duplicate prevention
  // Verify that an active VADLogicTracker produces only 1 END_OF_TURN event per utterance
  const vadSim = new VADLogicTracker({ silenceDelayMs: 1000, speechStartDelayMs: 100, minSpeechDurationMs: 200 });
  let clock = 5000;
  vadSim.evaluateFrame(0.08, clock);
  clock += 150;
  vadSim.evaluateFrame(0.08, clock); // SPEECH_START
  clock += 300;
  vadSim.evaluateFrame(0.08, clock); // total 450ms speech
  clock += 50;
  vadSim.evaluateFrame(0.001, clock); // pause start
  clock += 1100; // silence > 1000ms
  const decision1 = vadSim.evaluateFrame(0.001, clock);
  clock += 100;
  const decision2 = vadSim.evaluateFrame(0.001, clock);
  clock += 100;
  const decision3 = vadSim.evaluateFrame(0.001, clock);
  assert(
    decision1 === "END_OF_TURN" && decision2 === "IDLE" && decision3 === "IDLE",
    "Item 11: VAD timeout triggers exactly one END_OF_TURN event; subsequent frames are IDLE"
  );

  // ==========================================================================
  // SECTION 4: Barge-In & TTS Cancellation Integrity (Items 12 - 13)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Barge-In & TTS Cancellation (Items 12-13) ---${RESET}`);

  // Item 12: TTS cancellation during barge-in
  const ttsFlags = {
    interrupted: false,
    ended: false,
  };
  const mockTTS = new TextToSpeechEngine({
    onInterrupted: () => {
      ttsFlags.interrupted = true;
    },
    onEnd: () => {
      ttsFlags.ended = true;
    },
  });

  // Simulate TTS engine state
  (mockTTS as any).isSpeaking = true;
  assert(mockTTS.getIsSpeaking() === true, "Item 12: mockTTS reports speaking = true");
  mockTTS.stop();
  assert(mockTTS.getIsSpeaking() === false, "Item 12: mockTTS.stop() cancels speaking state immediately");
  assert(ttsFlags.interrupted === true, "Item 12: stop() while speaking fires onInterrupted callback");
  assert(ttsFlags.ended === true, "Item 12: stop() fires onEnd callback to clear playback state");

  // Item 13: TTS completion does not override interruption
  sm.reset("IDLE");
  sm.transition("PROCESSING");
  sm.handleTTSStart(); // state is AI_SPEAKING
  assert(sm.getState() === "AI_SPEAKING", "State is AI_SPEAKING");

  // Candidate interrupts
  sm.handleSpeechStart(); // transitions AI_SPEAKING -> INTERRUPTED -> LISTENING
  assert(sm.getState() === "LISTENING", "State is LISTENING after candidate barge-in");

  // Suppose browser async TTS onEnd event arrives late
  const handled = sm.handleTTSEnd();
  assert(handled === false, "Item 13: Late TTS onEnd returns false when machine has already transitioned to LISTENING");
  assert(sm.getState() === "LISTENING", "Item 13: Late TTS onEnd DOES NOT override candidate's LISTENING state");

  // ==========================================================================
  // SECTION 5: Modality Switching (Items 14 - 15)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Modality Switching Integrity (Items 14-15) ---${RESET}`);

  const mockSharedSession = {
    id: "sess_modality_test",
    userId: "user_test",
    type: "DOMAIN" as InterviewType,
    domain: "Software_Engineering",
    focusArea: "Kubernetes Orchestration",
    difficulty: "SENIOR",
    modality: "TEXT" as InterviewModality,
    status: "IN_PROGRESS" as SessionStatus,
    turnCounter: 3,
    messages: [
      { id: "m1", role: "assistant", content: "Tell me how Kubernetes manages Pod lifecycles.", createdAt: new Date() },
      { id: "m2", role: "user", content: "Kubelet monitors container runtime and reports status to api-server.", createdAt: new Date() },
      { id: "m3", role: "assistant", content: "How does graceful termination handle in-flight connections?", createdAt: new Date() },
    ],
  };

  // Item 14: Text -> Voice switching preserves session
  const textState = buildInterviewState(mockSharedSession);
  assert(textState.modality === "TEXT", "Item 14: Initial state is TEXT");

  const switchedToVoiceSession = {
    ...mockSharedSession,
    modality: "VOICE" as InterviewModality,
  };
  const voiceState = buildInterviewState(switchedToVoiceSession);
  assert(voiceState.modality === "VOICE", "Item 14: Switched state has modality='VOICE'");
  assert(voiceState.domain === textState.domain, "Item 14: Domain preserved across TEXT -> VOICE switch");
  assert(voiceState.focusArea === textState.focusArea, "Item 14: Focus area preserved across switch");
  assert(voiceState.messages.length === textState.messages.length, "Item 14: All message history preserved intact");
  assert(voiceState.questionNumber === textState.questionNumber, "Item 14: Question progression preserved");

  // Item 15: Voice -> Text switching preserves session
  const switchedBackToTextSession = {
    ...switchedToVoiceSession,
    modality: "TEXT" as InterviewModality,
    messages: [
      ...switchedToVoiceSession.messages,
      { id: "m4", role: "user", content: "PreStop hooks allow graceful draining of existing HTTP requests.", createdAt: new Date() },
    ],
  };
  const switchedBackState = buildInterviewState(switchedBackToTextSession);
  assert(switchedBackState.modality === "TEXT", "Item 15: Switched back state has modality='TEXT'");
  assert(switchedBackState.messages.length === 4, "Item 15: Message added during voice mode persists into text mode");
  assert(switchedBackState.difficulty === "SENIOR", "Item 15: Difficulty tier remains consistent across switches");

  // Reset state machine on switch to TEXT
  sm.reset("IDLE");
  assert(sm.getState() === "IDLE", "Item 15: Voice state machine cleanly resets to IDLE on TEXT switch");

  // ==========================================================================
  // SECTION 6: Error Handling & Fallbacks (Items 16 - 19)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Error Handling & Recovery (Items 16-19) ---${RESET}`);

  // Item 16: Microphone permission error recovery
  let receivedError: VoiceError | null = null;
  const errorSM = new VoiceStateMachine("LISTENING");
  errorSM.handleError({
    type: "PERMISSION_DENIED",
    message: "Microphone permission was denied.",
  });
  assert(errorSM.getState() === "ERROR", "Item 16: Permission error puts state machine into ERROR state");
  // User clears error and retries
  errorSM.reset("IDLE");
  assert(errorSM.getState() === "IDLE", "Item 16: User clearing error resets state machine cleanly to IDLE");

  // Item 17: Speech recognition error recovery
  const sttSM = new VoiceStateMachine("LISTENING");
  sttSM.handleError({
    type: "AUDIO_CAPTURE_ERROR",
    message: "Audio capture failed.",
  });
  assert(sttSM.getState() === "ERROR", "Item 17: Audio capture error transitions machine to ERROR");
  sttSM.reset("IDLE");
  assert(sttSM.transition("LISTENING"), "Item 17: Machine recovers from error and successfully listens on retry");

  // Item 18: TTS error recovery
  const ttsSM = new VoiceStateMachine("PROCESSING");
  ttsSM.handleTTSStart();
  assert(ttsSM.getState() === "AI_SPEAKING", "ttsSM starts in AI_SPEAKING");
  ttsSM.handleError({
    type: "SYNTHESIS_ERROR",
    message: "TTS synthesis stream failed.",
  });
  assert(ttsSM.getState() === "ERROR", "Item 18: TTS synthesis error puts machine into ERROR state");
  ttsSM.reset("IDLE");
  assert(ttsSM.getState() === "IDLE", "Item 18: TTS error resets smoothly");

  // Item 19: Unsupported voice fallback
  const unsupportedSTT = new SpeechToTextEngine();
  const isSTTSupported = unsupportedSTT.isSupported();
  assert(isSTTSupported === false, "Item 19: SpeechToTextEngine reports unsupported in Node environment without throwing");

  const unsupportedTTS = new TextToSpeechEngine();
  const isTTSSupported = unsupportedTTS.isSupported();
  assert(isTTSSupported === false, "Item 19: TextToSpeechEngine reports unsupported in Node environment without throwing");

  const unsupportedVAD = new VoiceActivityDetector();
  const isVADSupported = unsupportedVAD.isSupported();
  assert(isVADSupported === false, "Item 19: VoiceActivityDetector reports unsupported in Node environment without throwing");

  // ==========================================================================
  // SECTION 7: Backend Pipeline Equivalence (Item 20)
  // ==========================================================================
  console.log(`\n${YELLOW}--- Backend Pipeline Equivalence (Item 20) ---${RESET}`);

  // Item 20: Existing interview stream/orchestrator remains the single backend path
  const voiceUtterance = "We implement horizontal pod autoscaling based on custom Prometheus metrics.";
  const textUtterance = "We implement horizontal pod autoscaling based on custom Prometheus metrics.";

  const textDecision = InterviewOrchestrator.decideNextStep({
    state: textState,
    candidateMessage: textUtterance,
  });

  const voiceDecision = InterviewOrchestrator.decideNextStep({
    state: voiceState,
    candidateMessage: voiceUtterance,
  });

  assert(
    textDecision.action === voiceDecision.action,
    `Item 20: Orchestrator action is identical for voice & text: ${voiceDecision.action}`
  );
  assert(
    textDecision.targetPillarIndex === voiceDecision.targetPillarIndex,
    `Item 20: Orchestrator target pillar is identical: ${voiceDecision.targetPillarIndex}`
  );

  const textPrompt = buildSystemPrompt({
    state: textState,
    decision: textDecision,
  });
  const voicePrompt = buildSystemPrompt({
    state: voiceState,
    decision: voiceDecision,
  });

  assert(
    typeof voicePrompt === "string" && voicePrompt.length > 100,
    "Item 20: Voice prompt compiles successfully using same system prompt generator"
  );
  assert(
    voicePrompt.includes("Sarah Martinez") || voicePrompt.includes("Alex Chen") || voicePrompt.includes("Interviewer"),
    "Item 20: Voice prompt injects same authoritative persona and interview guidelines"
  );

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PHASE 5 TEST SUITE SUMMARY                      ${RESET}`);
  console.log(`${CYAN}====================================================${RESET}`);
  console.log(`  Total Passed: ${GREEN}${passedCount}${RESET}`);
  console.log(`  Total Failed: ${RED}${failedCount}${RESET}`);

  if (failedCount > 0) {
    console.error(`\n${RED}Phase 5 tests encountered ${failedCount} failure(s).${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}ALL PHASE 5 TESTS PASSED SUCCESSFULLY! (All 20 verification items satisfied)${RESET}\n`);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Unhandled test suite exception:", err);
  process.exit(1);
});
