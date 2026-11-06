export type VoiceState =
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "AI_SPEAKING"
  | "SPEAKING" // Backwards-compatible alias for AI_SPEAKING
  | "INTERRUPTED"
  | "ERROR";

export type SpeechLanguage = "en-IN" | "en-US" | "en-GB";

export interface SpeechLanguageOption {
  code: SpeechLanguage;
  label: string;
  flag: string;
}

export const SUPPORTED_SPEECH_LANGUAGES: SpeechLanguageOption[] = [
  { code: "en-IN", label: "English (India)", flag: "🇮🇳" },
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
];

export type VoiceErrorType =
  | "PERMISSION_DENIED"
  | "NOT_SUPPORTED"
  | "NO_MIC"
  | "AUDIO_CAPTURE_ERROR"
  | "NETWORK_ERROR"
  | "SYNTHESIS_ERROR"
  | "UNKNOWN";

export interface VoiceError {
  type: VoiceErrorType;
  message: string;
  originalError?: any;
}

export interface VADConfig {
  /** Root Mean Square (RMS) volume threshold above which speech is detected. Default: 0.025 */
  speechStartThreshold?: number;
  /** Milliseconds of sustained sound above threshold before triggering speech start. Default: 120ms */
  speechStartDelayMs?: number;
  /** Milliseconds of silence after speech before triggering automatic end-of-turn. Default: 1600ms */
  silenceDelayMs?: number;
  /** Minimum speech duration required before an end-of-turn can be committed. Default: 300ms */
  minSpeechDurationMs?: number;
}

export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: VoiceError) => void;
}

export interface VoiceTurnTiming {
  interviewerQuestionEndMs?: number;
  speechStartMs?: number;
  speechEndMs?: number;
  pauseIntervals?: Array<{ startMs: number; endMs: number; durationMs: number }>;
  isInterrupted?: boolean;
}

export interface STTCallbacks {
  onTranscriptChange?: (interimTranscript: string) => void;
  onFinalTranscript?: (finalTranscript: string, timing?: VoiceTurnTiming) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: VoiceError) => void;
}

export interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onInterrupted?: () => void;
  onError?: (error: VoiceError) => void;
}
