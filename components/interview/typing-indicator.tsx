export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-[85%] animate-fade-in">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm shadow-blue-500/20">
        <span className="font-heading font-extrabold text-xs tracking-tight select-none">AI</span>
      </div>
      <div className="p-4 rounded-2xl rounded-tl-sm bg-blue-50/70 dark:bg-slate-800/90 border border-blue-100/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-sm">
        <div className="flex items-center gap-1.5 h-5">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-medium">Interviewer is thinking...</span>
        </div>
      </div>
    </div>
  );
}