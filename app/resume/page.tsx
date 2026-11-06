import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";

export default function ResumePage() {
  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] transition-colors p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-1.5 rounded-input hover:bg-surface text-text-secondary hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs text-text-secondary">Back to Home</span>
          </div>
          <ThemeToggle />
        </div>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                ATS Resume Scanner
              </CardTitle>
              <Badge variant="neutral">Coming Soon</Badge>
            </div>
            <CardDescription className="pt-2">
              Resume upload, ATS match scoring, keyword gap analysis, and tailored JD alignment recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-text-secondary leading-relaxed">
              This module will support PDF/DOCX parsing and real-time ATS scoring against custom job descriptions.
            </p>
            <Link href="/interview" className="inline-block pt-2">
              <Button size="sm" className="rounded-full px-5 text-xs">
                Go to Mock Interviews →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}