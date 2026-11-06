import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface EndDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isEnding?: boolean;
}

export function EndDialog({
  isOpen,
  onClose,
  onConfirm,
  isEnding,
}: EndDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
            Conclude Interview Session?
          </h2>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Are you sure you want to end this interview? Your complete conversation transcript will be saved to your dashboard.
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isEnding}
          >
            Continue Interview
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            isLoading={isEnding}
            loadingText="Concluding..."
          >
            End Interview
          </Button>
        </div>
      </div>
    </div>
  );
}
