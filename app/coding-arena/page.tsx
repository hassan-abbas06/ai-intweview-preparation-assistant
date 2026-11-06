import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Monitor, Code2, Sparkles } from "lucide-react";

export default function CodingArenaPage() {
  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-purple-200/30 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm shadow-sm shadow-blue-500/25 shrink-0" title="Home">
              AI
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
          <ThemeToggle />
        </div>

        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                Coding Arena
              </CardTitle>
              <Badge variant="neutral">Coming Soon</Badge>
            </div>
            <CardDescription className="pt-1">
              Monaco code editor, algorithmic & domain problem bank, and automated test execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-3">
              <Monitor className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold text-sm">Desktop-Optimized Feature</p>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed text-xs">
                  The multi-file Monaco code editor and side-by-side test terminal are designed for desktop monitors. All other interview and ATS features are fully mobile responsive.
                </p>
              </div>
            </div>
            <Link href="/interview" className="inline-block pt-2">
              <Button size="sm" className="rounded-full px-5 text-xs">
                Try Adaptive Mock Interviews →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}