import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle, ArrowRight } from "lucide-react";

export interface JDConfirmationCardProps {
  role: string | null;
  seniority: string | null;
  skills: string[];
  responsibilities: string[];
  confidence: "ok" | "low" | string;
  onContinue: () => void;
  onSkip: () => void;
  isStarting: boolean;
}

export function JDConfirmationCard({
  role,
  seniority,
  skills,
  responsibilities,
  confidence,
  onContinue,
  onSkip,
  isStarting,
}: JDConfirmationCardProps) {
  const isLowConfidence = confidence === "low";

  return (
    <Card className="border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm transition-all" aria-label="Job description analysis results">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />
            <CardTitle className="text-base font-bold font-heading">
              Extracted Job Description Profile
            </CardTitle>
          </div>
          <Badge variant={isLowConfidence ? "warning" : "success"}>
            {isLowConfidence ? "Low Confidence" : "Verified JD"}
          </Badge>
        </div>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Review the profile extracted from your job description before starting.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Low confidence warning note */}
        {isLowConfidence && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold">Notice:</span> We couldn't extract much structured data from this text. The interview will proceed normally, but questions may not be tailored specifically to this job description.
            </div>
          </div>
        )}

        {/* Role & Seniority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Target Role
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
              {role || "Not detected"}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Seniority Level
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
              {seniority || "Not detected"}
            </span>
          </div>
        </div>

        {/* Skills Chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Detected Technologies & Skills ({skills.length})
          </label>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5" aria-label="Detected skills">
              {skills.map((skill, idx) => (
                <Badge
                  key={`${skill}-${idx}`}
                  variant="primary"
                  className="text-xs py-0.5 px-2.5 bg-blue-100/70 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-medium"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No specific technical skills detected</p>
          )}
        </div>

        {/* Key Responsibilities */}
        {responsibilities.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Key Responsibilities
            </label>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
              {responsibilities.map((resp, idx) => (
                <li key={idx} className="leading-relaxed">
                  {resp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-blue-100/80 dark:border-blue-900/40 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSkip}
          disabled={isStarting}
          className="w-full sm:w-auto text-xs"
          aria-label="Skip using this job description and start interview without it"
        >
          Skip, don't use this
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onContinue}
          isLoading={isStarting}
          loadingText="Starting..."
          className="w-full sm:w-auto text-xs flex items-center gap-1.5"
          aria-label="Continue with this job description profile"
        >
          Looks good, continue <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
