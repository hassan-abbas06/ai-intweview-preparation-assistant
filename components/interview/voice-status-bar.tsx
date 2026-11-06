"use client";

import * as React from "react";
import { Mic, Volume2, VolumeX, AlertCircle, RefreshCw, Radio, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoiceState, VoiceError, SpeechLanguage } from "@/lib/voice/types";

interface VoiceStatusBarProps {
  modality: "TEXT" | "VOICE";
  onToggleModality?: () => void;
  voiceState: VoiceState;
  interimTranscript?: string;
  voiceTranscript?: string;
  error?: VoiceError | null;
  onClearError?: () => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onStopSpeaking?: () => void;
  onResetTranscript?: () => void;
  language?: SpeechLanguage;
  onLanguageChange?: (lang: SpeechLanguage) => void;
  disabled?: boolean;
}

export function VoiceStatusBar({
  modality,
  onToggleModality,
  voiceState,
  interimTranscript,
  error,
  onClearError,
  onStopSpeaking,
  onResetTranscript,
  language = "en-IN",
  onLanguageChange,
  disabled,
}: VoiceStatusBarProps) {
  const isVoice = modality === "VOICE";

  return (
    <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all">
      {/* Top row: Status indicators, Accent selector & Modality Switcher */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {isVoice ? (
            <Badge variant="primary" className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
              <Radio className="w-3.5 h-3.5 animate-pulse text-white" />
              <span>Voice Mode (Active)</span>
            </Badge>
          ) : (
            <Badge variant="neutral" className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-text-secondary/50" />
              <span>Text Mode</span>
            </Badge>
          )}

          {/* Accent / Speech Recognition Locale Selector */}
          {isVoice && onLanguageChange && (
            <div className="flex items-center gap-1 text-xs text-text-secondary bg-surface-secondary/70 px-2 py-0.5 rounded-lg border border-border/60">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as SpeechLanguage)}
                className="bg-transparent text-[11px] font-medium text-text-primary focus:outline-none cursor-pointer py-0.5"
                title="Select your spoken accent for best recognition accuracy"
              >
                <option value="en-IN">🇮🇳 English (India)</option>
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="en-GB">🇬🇧 English (UK)</option>
              </select>
            </div>
          )}

          {/* Voice State Badge */}
          {isVoice && (
            <>
              {voiceState === "LISTENING" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Recording... (Click Pause when done)
                </span>
              )}
              {voiceState === "PROCESSING" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-blue animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Processing answer...
                </span>
              )}
              {(voiceState === "AI_SPEAKING" || voiceState === "SPEAKING") && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success animate-pulse">
                  <Volume2 className="w-3.5 h-3.5" />
                  Interviewer speaking... (speak to interrupt)
                </span>
              )}
              {voiceState === "INTERRUPTED" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning animate-pulse">
                  <Radio className="w-3.5 h-3.5 text-warning" />
                  Interrupted! Listening to your answer...
                </span>
              )}
              {voiceState === "IDLE" && (
                <span className="text-xs text-text-secondary">Ready to record (Click Record to speak)</span>
              )}
              {voiceState === "ERROR" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-error">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Voice issue
                </span>
              )}
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isVoice && (voiceState === "AI_SPEAKING" || voiceState === "SPEAKING") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStopSpeaking}
              className="h-8 text-xs flex items-center gap-1 border-primary/40 text-primary hover:bg-primary/10"
            >
              <VolumeX className="w-3.5 h-3.5" /> Stop Speaking
            </Button>
          )}

          {onToggleModality && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleModality}
              className="h-8 text-xs text-text-secondary hover:text-text-primary"
            >
              Switch to {isVoice ? "Text" : "Voice"}
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {isVoice && error && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-error/15 border border-error/30 text-xs text-error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error.message}</span>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="text-[11px] underline font-medium hover:opacity-80"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Interim Speech Preview */}
      {isVoice && (voiceState === "LISTENING" || interimTranscript) && (
        <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text-primary animate-fade-in flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Mic className="w-4 h-4 text-primary shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Live Transcript
              </span>
              <p className="italic text-text-primary leading-relaxed">
                {interimTranscript || "Listening... speak now"}
              </p>
            </div>
          </div>
          {Boolean(interimTranscript && onResetTranscript) && (
            <button
              type="button"
              onClick={onResetTranscript}
              className="text-[11px] text-text-secondary hover:text-error shrink-0 font-medium underline transition-colors"
              title="Clear transcript"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
