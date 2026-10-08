import { VADConfig, VADCallbacks, VoiceError } from "./types";

// ============================================================================
// PURE AUDIO MATH & UTILITIES (DETERMINISTIC & TESTABLE)
// ============================================================================

/**
 * Calculates Root Mean Square (RMS) energy from a time-domain audio buffer.
 * Pure mathematical calculation, fully testable in Node environment.
 */
export function calculateAudioRMS(buffer: Float32Array | number[]): number {
  if (!buffer || buffer.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    sum += val * val;
  }
  return Math.sqrt(sum / buffer.length);
}

export type VADDecision =
  | "SPEECH_START"
  | "SPEECH_CONTINUE"
  | "PAUSE_STARTED"
  | "END_OF_TURN"
  | "IDLE";

/**
 * Pure VAD state evaluator for deterministic lifecycle logic without browser dependencies.
 */
export class VADLogicTracker {
  private config: Required<VADConfig>;
  private isSpeaking = false;
  private speechStartTime: number | null = null;
  private silenceStartTime: number | null = null;
  private lastSpeechStartTime: number | null = null;
  private lastSpeechEndTime: number | null = null;
  private pauseIntervals: Array<{ startMs: number; endMs: number; durationMs: number }> = [];
  private lastTurnTiming: {
    speechStartMs: number | null;
    speechEndMs: number | null;
    pauseIntervals: Array<{ startMs: number; endMs: number; durationMs: number }>;
  } | null = null;

  constructor(config: VADConfig = {}) {
    this.config = {
      speechStartThreshold: config.speechStartThreshold ?? 0.025,
      speechStartDelayMs: config.speechStartDelayMs ?? 120,
      silenceDelayMs: config.silenceDelayMs ?? 1600,
      minSpeechDurationMs: config.minSpeechDurationMs ?? 300,
    };
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getLastTurnTiming(): {
    speechStartMs: number | null;
    speechEndMs: number | null;
    pauseIntervals: Array<{ startMs: number; endMs: number; durationMs: number }>;
  } {
    return (
      this.lastTurnTiming ?? {
        speechStartMs: this.lastSpeechStartTime,
        speechEndMs: this.lastSpeechEndTime,
        pauseIntervals: [...this.pauseIntervals],
      }
    );
  }

  /**
   * Evaluates a single audio frame timestamped at `now`.
   * Returns a discrete VADDecision.
   */
  public evaluateFrame(rms: number, now: number): VADDecision {
    const isAboveThreshold = rms >= this.config.speechStartThreshold;

    if (isAboveThreshold) {
      // Speech detected
      if (this.silenceStartTime !== null && this.isSpeaking) {
        // Candidate resumed speaking after silence: record pause if >= 400ms
        const pauseDuration = now - this.silenceStartTime;
        if (pauseDuration >= 400) {
          this.pauseIntervals.push({
            startMs: this.silenceStartTime,
            endMs: now,
            durationMs: pauseDuration,
          });
        }
      }
      this.silenceStartTime = null; // Cancel any active pause/silence timer

      if (!this.isSpeaking) {
        if (this.speechStartTime === null) {
          this.speechStartTime = now;
        }

        // Check if sound has been sustained long enough to confirm speech start
        if (now - this.speechStartTime >= this.config.speechStartDelayMs) {
          this.isSpeaking = true;
          this.lastSpeechStartTime = this.speechStartTime;
          this.pauseIntervals = [];
          return "SPEECH_START";
        }
        return "IDLE";
      }

      return "SPEECH_CONTINUE";
    } else {
      // Below threshold (silence/pause)
      if (this.isSpeaking) {
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now;
          return "PAUSE_STARTED";
        }

        // Check if silence duration exceeds end-of-turn threshold
        const elapsedSilence = now - this.silenceStartTime;
        const totalSpeechDuration = (this.silenceStartTime - (this.speechStartTime || 0));

        if (elapsedSilence >= this.config.silenceDelayMs) {
          this.isSpeaking = false;
          this.lastSpeechEndTime = this.silenceStartTime;
          this.lastTurnTiming = {
            speechStartMs: this.lastSpeechStartTime,
            speechEndMs: this.lastSpeechEndTime,
            pauseIntervals: [...this.pauseIntervals],
          };
          this.speechStartTime = null;
          this.silenceStartTime = null;

          if (totalSpeechDuration >= this.config.minSpeechDurationMs) {
            return "END_OF_TURN";
          }
          return "IDLE";
        }

        return "PAUSE_STARTED";
      }

      // Not speaking and below threshold
      this.speechStartTime = null;
      return "IDLE";
    }
  }

  public reset(): void {
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.silenceStartTime = null;
    this.pauseIntervals = [];
  }
}

// ============================================================================
// BROWSER-NATIVE VOICE ACTIVITY DETECTOR (WEB AUDIO API)
// ============================================================================

export class VoiceActivityDetector {
  private config: Required<VADConfig>;
  private callbacks: VADCallbacks;
  private logic: VADLogicTracker;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;

  constructor(callbacks: VADCallbacks = {}, config: VADConfig = {}) {
    this.callbacks = callbacks;
    this.config = {
      speechStartThreshold: config.speechStartThreshold ?? 0.025,
      speechStartDelayMs: config.speechStartDelayMs ?? 120,
      silenceDelayMs: config.silenceDelayMs ?? 1600,
      minSpeechDurationMs: config.minSpeechDurationMs ?? 300,
    };
    this.logic = new VADLogicTracker(this.config);
  }

  public setCallbacks(callbacks: VADCallbacks) {
    this.callbacks = callbacks;
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Connects to a microphone MediaStream and begins continuous energy analysis.
   */
  public start(stream: MediaStream): boolean {
    if (this.isRunning) return true;
    if (!this.isSupported()) {
      this.callbacks.onError?.({
        type: "NOT_SUPPORTED",
        message: "Web Audio API is not supported in this browser.",
      });
      return false;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtxClass();

      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      this.isRunning = true;
      this.logic.reset();

      const timeDomainData = new Float32Array(this.analyser.fftSize);

      const checkLoop = () => {
        if (!this.isRunning || !this.analyser) return;

        this.analyser.getFloatTimeDomainData(timeDomainData);
        const rms = calculateAudioRMS(timeDomainData);
        const now = Date.now();

        this.callbacks.onVolumeChange?.(rms);

        const decision = this.logic.evaluateFrame(rms, now);

        if (decision === "SPEECH_START") {
          this.callbacks.onSpeechStart?.();
        } else if (decision === "END_OF_TURN") {
          this.callbacks.onSpeechEnd?.();
        }

        this.animationFrameId = requestAnimationFrame(checkLoop);
      };

      this.animationFrameId = requestAnimationFrame(checkLoop);
      return true;
    } catch (err: any) {
      console.error("[VAD Error] Failed to initialize AudioContext analyser:", err);
      this.cleanup();
      this.callbacks.onError?.({
        type: "AUDIO_CAPTURE_ERROR",
        message: "Failed to initialize microphone audio analyzer.",
        originalError: err,
      });
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.logic.reset();
  }

  public cleanup(): void {
    this.stop();
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Ignore
      }
      this.sourceNode = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // Ignore
      }
      this.analyser = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }
  }

  public isSpeechActive(): boolean {
    return this.logic.getIsSpeaking();
  }

  public getLastTurnTiming() {
    return this.logic.getLastTurnTiming();
  }
}
