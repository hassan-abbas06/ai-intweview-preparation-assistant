import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "assistant" | "user" | "system";
  content: string;
  isStreaming?: boolean;
  interviewerName?: string;
  isVoice?: boolean;
}

/**
 * Strips internal system markers, completion tokens, and bracketed orchestration signals
 * from displaying in the candidate UI.
 */
export function sanitizeDisplayContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[SESSION_COMPLETED\]/gi, "")
    .replace(/\[SESSION_COMPLETE\]/gi, "")
    .replace(/\[SESSION_END\]/gi, "")
    .replace(/\[INTERVIEW_COMPLETED\]/gi, "")
    .replace(/\[SESSION_?[A-Z]*$/i, "")
    .trim();
}

export function ChatBubble({ role, content, isStreaming, interviewerName, isVoice }: ChatBubbleProps) {
  const isAI = role === "assistant";
  const displayContent = isAI ? sanitizeDisplayContent(content) : content;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 sm:gap-3.5 max-w-[96%] xs:max-w-[92%] sm:max-w-[85%]",
        isAI ? "self-start" : "self-end flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-xs transition-colors",
          isAI
            ? "bg-blue-600 text-white font-heading font-extrabold shadow-blue-500/20"
            : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        )}
      >
        {isAI ? (
          <span className="text-xs font-bold tracking-tight select-none">AI</span>
        ) : isVoice ? (
          <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        )}
      </div>

      <div
        className={cn(
          "p-4 sm:p-5 rounded-2xl shadow-sm text-sm transition-all overflow-hidden max-w-full",
          isAI
            ? "rounded-tl-sm bg-blue-50/70 dark:bg-slate-800/90 border border-blue-100/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-100"
            : "rounded-tr-sm bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white"
        )}
      >
        <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-slate-200/50 dark:border-slate-700/50">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
            {isAI
              ? interviewerName
                ? `${interviewerName} (Interviewer)`
                : "Interviewer"
              : "You (Candidate)"}
            {!isAI && isVoice && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60">
                <Mic className="w-2.5 h-2.5" /> Spoken
              </span>
            )}
          </span>
          {isStreaming && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 animate-pulse font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" /> Streaming...
            </span>
          )}
        </div>

        {isAI ? (
          <div className="markdown-content text-sm leading-relaxed space-y-2.5 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 leading-relaxed text-slate-800 dark:text-slate-200">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-slate-800 dark:text-slate-200">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 my-2 space-y-1 text-slate-800 dark:text-slate-200">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-800 dark:text-slate-200">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 rounded-md bg-blue-100/60 dark:bg-slate-700/60 font-mono text-xs text-blue-700 dark:text-blue-300">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="p-3 my-2 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
                      <code>{children}</code>
                    </pre>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-blue-500 pl-3 italic text-slate-600 dark:text-slate-400 my-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed text-sm text-slate-900 dark:text-slate-100 break-words">
            {displayContent}
          </p>
        )}
      </div>
    </div>
  );
}