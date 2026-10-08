import { STTCallbacks, VoiceError, VoiceState, VADConfig, VoiceTurnTiming } from "./types";
import { VoiceActivityDetector } from "./vad";

// Declarations for browser SpeechRecognition API
interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class SpeechToTextEngine {
  private recognition: any = null;
  private mediaStream: MediaStream | null = null;
  private vad: VoiceActivityDetector | null = null;
  private isListening = false;
  private accumulatedFinalTranscript = "";
  private latestInterim = "";
  private callbacks: STTCallbacks;
  private vadConfig: VADConfig;
  private restartTimeout: NodeJS.Timeout | null = null;
  private lastInterviewerQuestionEndMs: number | null = null;
  private wasInterrupted = false;

  constructor(callbacks: STTCallbacks = {}, vadConfig: VADConfig = {}) {
    this.callbacks = callbacks;
    this.vadConfig = vadConfig;
  }

  public setCallbacks(callbacks: STTCallbacks) {
    this.callbacks = callbacks;
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as IWindowSpeechRecognition;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  /**
   * Explicitly requests and verifies microphone hardware permissions.
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onError?.({
        type: "NOT_SUPPORTED",
        message: "Microphone access is not supported by your current browser environment.",
      });
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      return true;
    } catch (err: any) {
      const errorName = err?.name || "";
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        this.callbacks.onError?.({
          type: "PERMISSION_DENIED",
          message: "Microphone permission was denied. Please allow microphone access in your browser settings.",
          originalError: err,
        });
      } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        this.callbacks.onError?.({
          type: "NO_MIC",
          message: "No microphone device detected. Please connect an audio input device.",
          originalError: err,
        });
      } else {
        this.callbacks.onError?.({
          type: "AUDIO_CAPTURE_ERROR",
          message: `Microphone error: ${err.message || "Failed to access microphone."}`,
          originalError: err,
        });
      }
      return false;
    }
  }

  /**
   * Starts continuous listening for candidate speech with active VAD.
   */
  public async startListening(): Promise<boolean> {
    if (this.isListening) return true;

    if (!this.isSupported()) {
      this.callbacks.onError?.({
        type: "NOT_SUPPORTED",
        message: "Speech recognition is not supported in this browser. Please use Chrome, Edge, or switch to Text mode.",
      });
      return false;
    }

    // Verify microphone hardware permission first
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      this.callbacks.onStateChange?.("ERROR");
      return false;
    }

    try {
      this.isListening = true;
      this.accumulatedFinalTranscript = "";
      this.latestInterim = "";

      // Initialize and start Voice Activity Detector on the active microphone stream
      if (this.mediaStream) {
        this.vad = new VoiceActivityDetector(
          {
            onSpeechStart: () => {
              this.callbacks.onSpeechStart?.();
            },
            onSpeechEnd: () => {
              this.callbacks.onSpeechEnd?.();
              this.handleAutoEndOfTurn();
            },
            onError: (err) => {
              console.warn("[VAD Warning]:", err.message);
            },
          },
          this.vadConfig
        );
        this.vad.start(this.mediaStream);
      }

      this.initRecognition();
      return true;
    } catch (err: any) {
      console.error("[STT Error] Failed to start speech recognition:", err);
      this.cleanup();
      this.callbacks.onError?.({
        type: "AUDIO_CAPTURE_ERROR",
        message: err.message || "Failed to initialize speech recognition.",
        originalError: err,
      });
      this.callbacks.onStateChange?.("ERROR");
      return false;
    }
  }

  /**
   * Initializes or restarts the underlying browser SpeechRecognition instance.
   */
  private initRecognition(): void {
    if (!this.isListening) return;
    if (typeof window === "undefined") return;

    const win = window as IWindowSpeechRecognition;
    const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      if (this.recognition) {
        try {
          this.recognition.onstart = null;
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          this.recognition.abort();
        } catch {
          // Ignore
        }
      }

      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.callbacks.onStateChange?.("LISTENING");
      };

      this.recognition.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalChunk += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (finalChunk) {
          this.accumulatedFinalTranscript += (this.accumulatedFinalTranscript ? " " : "") + finalChunk.trim();
        }
        this.latestInterim = interim.trim();

        const currentDisplay = [this.accumulatedFinalTranscript, this.latestInterim].filter(Boolean).join(" ").trim();
        this.callbacks.onTranscriptChange?.(currentDisplay);
      };

      this.recognition.onerror = (event: any) => {
        const error = event.error;
        if (error === "no-speech") {
          // Normal silence, don't crash or abort
          return;
        }
        if (error === "aborted" && !this.isListening) {
          return;
        }

        console.warn("[STT Warning] Speech recognition event error:", error);

        if (error === "not-allowed") {
          this.callbacks.onError?.({
            type: "PERMISSION_DENIED",
            message: "Microphone permission was blocked. Please grant access in your browser.",
          });
          this.callbacks.onStateChange?.("ERROR");
        } else if (error === "audio-capture") {
          this.callbacks.onError?.({
            type: "AUDIO_CAPTURE_ERROR",
            message: "Could not capture audio from your microphone.",
          });
          this.callbacks.onStateChange?.("ERROR");
        } else if (error === "network") {
          this.callbacks.onError?.({
            type: "NETWORK_ERROR",
            message: "Network error during speech recognition.",
          });
        }
      };

      this.recognition.onend = () => {
        // Continuous listening: if user is still in listening mode,
        // automatically restart after the browser pauses on prolonged silence
        if (this.isListening) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isListening) {
              try {
                this.recognition?.start();
              } catch {
                // Ignore if already active
              }
            }
          }, 80);
        }
      };

      this.recognition.start();
    } catch (err: any) {
      console.warn("[STT Warning] Failed to start recognition instance:", err);
    }
  }

  public setInterviewerQuestionEnd(timestampMs: number): void {
    this.lastInterviewerQuestionEndMs = timestampMs;
  }

  public markInterrupted(): void {
    this.wasInterrupted = true;
  }

  private buildTurnTiming(): VoiceTurnTiming | undefined {
    const vadTiming = this.vad?.getLastTurnTiming();
    return {
      interviewerQuestionEndMs: this.lastInterviewerQuestionEndMs ?? undefined,
      speechStartMs: vadTiming?.speechStartMs ?? undefined,
      speechEndMs: vadTiming?.speechEndMs ?? undefined,
      pauseIntervals: vadTiming?.pauseIntervals ?? [],
      isInterrupted: this.wasInterrupted,
    };
  }

  /**
   * Called automatically by VAD when the candidate stops speaking and silence threshold elapses.
   */
  public handleAutoEndOfTurn(): void {
    if (!this.isListening) return;

    const fullTranscript = this.getCurrentTranscript();
    if (!fullTranscript) return;

    const timing = this.buildTurnTiming();
    this.wasInterrupted = false;

    // Reset buffer before emitting turn
    this.accumulatedFinalTranscript = "";
    this.latestInterim = "";

    this.callbacks.onTranscriptChange?.("");
    this.callbacks.onFinalTranscript?.(fullTranscript, timing);
  }

  /**
   * Returns current combined transcript (accumulated final + latest interim).
   */
  public getCurrentTranscript(): string {
    return [this.accumulatedFinalTranscript, this.latestInterim].filter(Boolean).join(" ").trim();
  }

  /**
   * Resets internal transcript buffers (e.g. upon barge-in or when a turn starts).
   */
  public resetTranscript(): void {
    this.accumulatedFinalTranscript = "";
    this.latestInterim = "";
    this.callbacks.onTranscriptChange?.("");
  }

  /**
   * Manually stops listening and finalizes candidate transcript.
   */
  public stopListening(): string {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    const finalResult = this.getCurrentTranscript();
    this.isListening = false;

    if (this.vad) {
      this.vad.stop();
    }

    try {
      if (this.recognition) {
        this.recognition.stop();
      }
    } catch {
      // Ignore if already stopped
    }

    this.cleanupMediaStream();

    const timing = this.buildTurnTiming();
    this.wasInterrupted = false;

    if (finalResult) {
      this.callbacks.onStateChange?.("PROCESSING");
      this.callbacks.onFinalTranscript?.(finalResult, timing);
    } else {
      this.callbacks.onStateChange?.("IDLE");
    }

    this.accumulatedFinalTranscript = "";
    this.latestInterim = "";
    return finalResult;
  }

  /**
   * Aborts listening immediately without producing a final transcript.
   */
  public abort(): void {
    this.isListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.accumulatedFinalTranscript = "";
    this.latestInterim = "";

    if (this.vad) {
      this.vad.stop();
    }

    try {
      if (this.recognition) {
        this.recognition.abort();
      }
    } catch {
      // Ignore
    }
    this.cleanup();
    this.callbacks.onStateChange?.("IDLE");
  }

  private cleanupMediaStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      this.mediaStream = null;
    }
  }

  public cleanup(): void {
    this.isListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.vad) {
      this.vad.cleanup();
      this.vad = null;
    }
    this.cleanupMediaStream();
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
  }
}
