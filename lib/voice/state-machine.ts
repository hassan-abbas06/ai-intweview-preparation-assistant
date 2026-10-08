import { VoiceState, VoiceError } from "./types";

// ============================================================================
// VOICE INTERACTION STATE MACHINE & TURN COORDINATOR
// ============================================================================

export interface TurnSubmissionDecision {
  shouldSubmit: boolean;
  transcript: string;
  turnId: string;
  reason?: string;
}

export type StateChangeCallback = (state: VoiceState, previousState: VoiceState) => void;

/**
 * Valid state transitions table.
 * Strictly prevents invalid transitions (e.g. LISTENING -> AI_SPEAKING without processing).
 */
const VALID_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
  IDLE: ["LISTENING", "PROCESSING", "AI_SPEAKING", "SPEAKING", "ERROR"],
  LISTENING: ["PROCESSING", "IDLE", "ERROR"],
  PROCESSING: ["AI_SPEAKING", "SPEAKING", "LISTENING", "IDLE", "ERROR"],
  AI_SPEAKING: ["INTERRUPTED", "LISTENING", "IDLE", "ERROR"],
  SPEAKING: ["INTERRUPTED", "LISTENING", "IDLE", "ERROR"],
  INTERRUPTED: ["LISTENING", "IDLE", "ERROR"],
  ERROR: ["IDLE", "LISTENING"],
};

export class VoiceStateMachine {
  private currentState: VoiceState = "IDLE";
  private isSubmittingTurn = false;
  private currentTurnId = 0;
  private lastSubmittedTranscript = "";
  private lastSubmittedAt = 0;
  private onStateChange?: StateChangeCallback;

  constructor(initialState: VoiceState = "IDLE", onStateChange?: StateChangeCallback) {
    this.currentState = initialState;
    this.onStateChange = onStateChange;
  }

  public getState(): VoiceState {
    return this.currentState;
  }

  public setOnStateChange(cb?: StateChangeCallback) {
    this.onStateChange = cb;
  }

  /**
   * Checks whether a proposed transition is valid according to the state model.
   */
  public canTransitionTo(nextState: VoiceState): boolean {
    if (this.currentState === nextState) return true;
    const allowed = VALID_TRANSITIONS[this.currentState] || [];
    return allowed.includes(nextState);
  }

  /**
   * Atomically transitions the machine to a new state if valid.
   */
  public transition(nextState: VoiceState, reason?: string): boolean {
    // Normalize "SPEAKING" to "AI_SPEAKING"
    const targetState: VoiceState = nextState === "SPEAKING" ? "AI_SPEAKING" : nextState;

    if (this.currentState === targetState) {
      return true;
    }

    if (!this.canTransitionTo(targetState)) {
      console.warn(
        `[VoiceStateMachine] Invalid transition rejected: ${this.currentState} -> ${targetState} (${reason || "unspecified"})`
      );
      return false;
    }

    const prevState = this.currentState;
    this.currentState = targetState;

    this.onStateChange?.(this.currentState, prevState);
    return true;
  }

  /**
   * Handles candidate speech detected.
   * If the AI is currently speaking, triggers immediate barge-in interruption.
   */
  public handleSpeechStart(): { interrupted: boolean } {
    if (this.currentState === "AI_SPEAKING" || this.currentState === "SPEAKING") {
      // Barge-in scenario
      this.transition("INTERRUPTED", "Candidate started speaking during AI speech");
      this.transition("LISTENING", "Resuming candidate speech capture after barge-in");
      return { interrupted: true };
    }

    if (this.currentState === "IDLE") {
      this.transition("LISTENING", "Candidate started speaking from IDLE");
    }

    return { interrupted: false };
  }

  /**
   * Evaluates an end-of-turn event and strictly guards against duplicate submissions.
   */
  public evaluateTurnSubmission(rawTranscript: string): TurnSubmissionDecision {
    const transcript = (rawTranscript || "").trim();

    // 1. Ignore empty or whitespace-only transcripts
    if (!transcript) {
      return {
        shouldSubmit: false,
        transcript: "",
        turnId: "",
        reason: "EMPTY_TRANSCRIPT",
      };
    }

    // 2. Reject if a turn is already currently being processed/submitted
    if (this.isSubmittingTurn) {
      return {
        shouldSubmit: false,
        transcript,
        turnId: "",
        reason: "SUBMISSION_IN_PROGRESS",
      };
    }

    // 3. Reject duplicate identical transcripts within 3000ms
    const now = Date.now();
    if (transcript === this.lastSubmittedTranscript && now - this.lastSubmittedAt < 3000) {
      return {
        shouldSubmit: false,
        transcript,
        turnId: "",
        reason: "DUPLICATE_TRANSCRIPT_DEBOUNCED",
      };
    }

    // 4. Verify current state allows transition to PROCESSING
    if (this.currentState !== "LISTENING" && this.currentState !== "INTERRUPTED") {
      return {
        shouldSubmit: false,
        transcript,
        turnId: "",
        reason: `INVALID_STATE_FOR_SUBMISSION_${this.currentState}`,
      };
    }

    // 5. Claim the turn atomically
    this.isSubmittingTurn = true;
    this.currentTurnId++;
    const turnId = `voice_turn_${this.currentTurnId}_${Date.now()}`;
    this.lastSubmittedTranscript = transcript;
    this.lastSubmittedAt = now;

    this.transition("PROCESSING", "Candidate utterance complete; submitting turn");

    return {
      shouldSubmit: true,
      transcript,
      turnId,
    };
  }

  /**
   * Concludes the active turn submission lifecycle when backend finishes or errors.
   */
  public finishTurnSubmission(): void {
    this.isSubmittingTurn = false;
  }

  /**
   * Handles the start of AI speech.
   */
  public handleTTSStart(): boolean {
    if (this.currentState === "PROCESSING" || this.currentState === "IDLE" || this.currentState === "LISTENING") {
      return this.transition("AI_SPEAKING", "AI began speaking");
    }
    return false;
  }

  /**
   * Handles natural completion of AI speech.
   * If the AI was interrupted by candidate barge-in, do NOT overwrite the state!
   */
  public handleTTSEnd(): boolean {
    if (this.currentState === "INTERRUPTED") {
      // Retain interrupted state or proceed to listening
      return this.transition("LISTENING", "TTS finished after interruption");
    }

    if (this.currentState === "AI_SPEAKING" || this.currentState === "SPEAKING") {
      return this.transition("LISTENING", "TTS naturally completed; candidate turn starts");
    }

    return false;
  }

  /**
   * Handles errors safely, transitioning machine to ERROR state.
   */
  public handleError(error: VoiceError): void {
    this.isSubmittingTurn = false;
    this.transition("ERROR", `Voice error: ${error.type}`);
  }

  /**
   * Resets the machine to IDLE or a specified recoverable state (e.g. on modality toggle).
   */
  public reset(targetState: VoiceState = "IDLE"): void {
    this.isSubmittingTurn = false;
    this.currentState = targetState;
    this.onStateChange?.(this.currentState, "IDLE");
  }
}
