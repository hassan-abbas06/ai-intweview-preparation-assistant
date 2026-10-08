"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SpeechToTextEngine } from "./stt";
import { TextToSpeechEngine } from "./tts";
import { VoiceStateMachine } from "./state-machine";
import { VoiceError, VoiceState, VADConfig, VoiceTurnTiming } from "./types";

interface UseVoiceSessionOptions {
  enabled: boolean;
  onFinalTranscript?: (transcript: string, timing?: VoiceTurnTiming) => void;
  vadConfig?: VADConfig;
}

export function useVoiceSession({
  enabled,
  onFinalTranscript,
  vadConfig,
}: UseVoiceSessionOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<VoiceError | null>(null);

  const sttRef = useRef<SpeechToTextEngine | null>(null);
  const ttsRef = useRef<TextToSpeechEngine | null>(null);
  const stateMachineRef = useRef<VoiceStateMachine>(
    new VoiceStateMachine("IDLE", (newState) => {
      setVoiceState(newState);
    })
  );

  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;

  // Initialize engines lazily on client
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sm = stateMachineRef.current;
    const stt = new SpeechToTextEngine({}, vadConfig);
    const tts = new TextToSpeechEngine();

    sttRef.current = stt;
    ttsRef.current = tts;

    // Wire STT callbacks with StateMachine and VAD
    stt.setCallbacks({
      onSpeechStart: () => {
        const { interrupted } = sm.handleSpeechStart();
        if (interrupted) {
          // Barge-in: immediately cancel audio playback
          tts.stop();
          stt.markInterrupted();
          stt.resetTranscript();
        }
      },
      onSpeechEnd: () => {
        // Automatic end-of-turn handled via onFinalTranscript
      },
      onTranscriptChange: (text) => {
        setInterimTranscript(text);
      },
      onFinalTranscript: (finalText, timing) => {
        const decision = sm.evaluateTurnSubmission(finalText);
        if (decision.shouldSubmit) {
          setInterimTranscript("");
          onFinalTranscriptRef.current?.(decision.transcript, timing);
        }
      },
      onError: (err) => {
        setError(err);
        sm.handleError(err);
      },
    });

    // Wire TTS callbacks with StateMachine
    tts.setCallbacks({
      onStart: () => {
        sm.handleTTSStart();
      },
      onEnd: () => {
        sm.handleTTSEnd();
        stt.setInterviewerQuestionEnd(Date.now());
        // Once AI speech completes, resume listening for candidate answer
        if (sm.getState() === "LISTENING") {
          stt.startListening().catch(() => {});
        }
      },
      onInterrupted: () => {
        // Interruption already handled in onSpeechStart
      },
      onError: (err) => {
        setError(err);
        sm.handleError(err);
      },
    });

    return () => {
      stt.cleanup();
      tts.cleanup();
      sm.reset("IDLE");
    };
  }, [vadConfig]);

  // Handle modality switching (VOICE <-> TEXT)
  useEffect(() => {
    const stt = sttRef.current;
    const tts = ttsRef.current;
    const sm = stateMachineRef.current;

    if (!enabled) {
      // Switching to TEXT: gracefully stop any active voice listening or speech
      stt?.abort();
      tts?.stop();
      sm.reset("IDLE");
      setInterimTranscript("");
      setError(null);
    } else {
      // Switching to VOICE: initialize state safely
      sm.reset("IDLE");
    }
  }, [enabled]);

  const startListening = useCallback(async () => {
    if (!enabled || !sttRef.current) return false;
    setError(null);
    setInterimTranscript("");

    const sm = stateMachineRef.current;

    // Cancel any active AI playback before starting candidate turn
    if (ttsRef.current) {
      ttsRef.current.stop();
    }

    const started = await sttRef.current.startListening();
    if (started) {
      sm.transition("LISTENING", "User started listening manually");
    }
    return started;
  }, [enabled]);

  const stopListening = useCallback(() => {
    if (!sttRef.current) return "";
    return sttRef.current.stopListening();
  }, []);

  const speak = useCallback(
    (text: string, messageId?: string) => {
      if (!enabled || !ttsRef.current) return false;
      const sm = stateMachineRef.current;
      sm.handleTTSStart();
      return ttsRef.current.speak(text, messageId);
    },
    [enabled]
  );

  const stopSpeaking = useCallback(() => {
    if (ttsRef.current) {
      ttsRef.current.stop();
    }
    const sm = stateMachineRef.current;
    sm.transition("LISTENING", "Manual stop speaking; ready to listen");
    sttRef.current?.startListening().catch(() => {});
  }, []);

  const finishTurnSubmission = useCallback(() => {
    stateMachineRef.current.finishTurnSubmission();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    stateMachineRef.current.reset("IDLE");
  }, []);

  return {
    voiceState,
    setVoiceState,
    interimTranscript,
    error,
    clearError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    finishTurnSubmission,
    isSTTSupported: sttRef.current ? sttRef.current.isSupported() : false,
    isTTSSupported: ttsRef.current ? ttsRef.current.isSupported() : false,
  };
}

