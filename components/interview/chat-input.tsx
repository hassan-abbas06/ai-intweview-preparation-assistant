import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Send, Mic, Pause, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isVoiceActive?: boolean;
  isListening?: boolean;
  onToggleListening?: () => void;
  voiceState?: string;
  voiceTranscript?: string;
  onTranscribeWhisper?: () => Promise<string | null>;
}

export function ChatInput({
  onSendMessage,
  disabled,
  placeholder = "Type your response or ask a clarifying question...",
  isVoiceActive,
  isListening,
  onToggleListening,
  voiceState,
  voiceTranscript,
  onTranscribeWhisper,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [isTranscribingWhisper, setIsTranscribingWhisper] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [text]);

  // Auto-focus textarea when re-enabled after interviewer finishes streaming
  // AND ensure input state is wiped clean when submission begins or round advances
  const prevDisabledRef = useRef(disabled);
  useEffect(() => {
    if (disabled) {
      setText("");
      userTypedPrefixRef.current = "";
      isPopulatedByVoiceRef.current = false;
    } else if (prevDisabledRef.current && !disabled) {
      setText("");
      userTypedPrefixRef.current = "";
      isPopulatedByVoiceRef.current = false;
      textareaRef.current?.focus();
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  // Track any text typed by hand prior to activating speech recording
  const userTypedPrefixRef = useRef("");
  const isPopulatedByVoiceRef = useRef(false);

  // Synchronize live voice transcription into the textarea without duplicating
  useEffect(() => {
    if (disabled) return;
    if (isListening && voiceTranscript !== undefined) {
      isPopulatedByVoiceRef.current = true;
      const prefix = userTypedPrefixRef.current.trim();
      const spoken = voiceTranscript.trim();

      if (spoken) {
        setText(prefix ? `${prefix} ${spoken}` : spoken);
      } else if (!prefix) {
        setText("");
      }
    }
  }, [voiceTranscript, isListening, disabled]);

  const handleWhisperEnhance = async () => {
    if (!onTranscribeWhisper || isTranscribingWhisper) return;
    setIsTranscribingWhisper(true);
    try {
      const enhanced = await onTranscribeWhisper();
      if (enhanced) {
        setText(enhanced);
        userTypedPrefixRef.current = "";
        isPopulatedByVoiceRef.current = true;
      }
    } catch (err) {
      console.warn("Whisper enhance error:", err);
    } finally {
      setIsTranscribingWhisper(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = text.trim();
    if (!content || disabled) return;

    // Immediately wipe local textarea input state before triggering turn send
    setText("");
    userTypedPrefixRef.current = "";
    isPopulatedByVoiceRef.current = false;

    // If still recording when submitting, pause recording first
    if (isListening) {
      onToggleListening?.();
    }

    onSendMessage(content);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const effectivePlaceholder = isListening
    ? "Recording... speak now or click Pause"
    : isVoiceActive
    ? text.trim()
      ? "Review your response, click Resume to speak more, or Send"
      : "Type your response or click Record to speak..."
    : placeholder;

  return (
    <div
      className={cn(
        "relative w-full border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-sm p-2.5 focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:border-blue-500 transition-all",
        isListening && "ring-2 ring-rose-500/50 border-rose-500"
      )}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          // If the user manually edits while not recording, keep that as prefix
          if (!isListening) {
            userTypedPrefixRef.current = e.target.value;
            isPopulatedByVoiceRef.current = false;
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={effectivePlaceholder}
        disabled={disabled}
        className="w-full resize-none bg-transparent px-3 py-2 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 min-h-[48px] max-h-[200px]"
      />

      <div className="flex items-center justify-between pt-2 px-2 border-t border-slate-100 dark:border-slate-700/60">
        <span className="text-[11px] text-slate-400 hidden sm:inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-mono text-[10px] text-slate-600 dark:text-slate-300">
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-mono text-[10px] text-slate-600 dark:text-slate-300">
            Shift+Enter
          </kbd>{" "}
          for newline
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Optional Whisper AI transcription button for noisy environments */}
          {isVoiceActive && onTranscribeWhisper && text.trim() && (
            <Button
              type="button"
              onClick={handleWhisperEnhance}
              disabled={disabled || isTranscribingWhisper}
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full transition-all"
              title="Clean up and enhance transcription using Whisper AI"
            >
              {isTranscribingWhisper ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span className="hidden sm:inline">
                {isTranscribingWhisper ? "Enhancing..." : "AI Enhance"}
              </span>
            </Button>
          )}

          {/* Voice Record / Pause Toggle Button */}
          {onToggleListening && (
            <Button
              type="button"
              onClick={onToggleListening}
              disabled={disabled && !isListening}
              size="sm"
              variant={isListening ? "primary" : "outline"}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3.5 h-8 text-xs font-semibold rounded-full transition-all",
                isListening
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-sm animate-pulse border-rose-500"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
              title={isListening ? "Pause recording" : text.trim() ? "Resume recording" : "Record voice"}
            >
              {isListening ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden xs:inline">Pause</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{text.trim() ? "Resume" : "Record"}</span>
                </>
              )}
            </Button>
          )}

          {/* Text Send Button */}
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!text.trim() || disabled}
            size="sm"
            className="flex items-center justify-center gap-1.5 px-4 h-8 text-xs font-semibold rounded-full min-w-[50px] shadow-sm shadow-blue-500/25"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
