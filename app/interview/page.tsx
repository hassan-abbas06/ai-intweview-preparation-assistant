"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { DOMAIN_OPTIONS, SOFTWARE_ENGINEERING_SUBFOCUS } from "@/lib/constants/domains";
import {
  Briefcase,
  Users,
  BrainCircuit,
  Calculator,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  CheckCircle2,
  Mic,
  MessageSquare,
} from "lucide-react";

interface TrackCardOption {
  type: "HR" | "DOMAIN" | "MANAGERIAL" | "APTITUDE";
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeColor: "primary" | "secondary" | "success" | "warning";
  tag: string;
}

const TRACKS: TrackCardOption[] = [
  {
    type: "DOMAIN",
    title: "Technical / Domain Deep Dive",
    subtitle: "Architecture, trade-offs, and depth",
    description: "Rigorous technical discussion across Software Engineering, Data Science, Analytics, Cybersecurity, Finance, or Accounting with live follow-ups.",
    icon: BrainCircuit,
    color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    badgeColor: "primary",
    tag: "Most Popular",
  },
  {
    type: "HR",
    title: "HR & Behavioral Round",
    subtitle: "Culture, collaboration, STAR method",
    description: "Practice answering situational questions, handling team conflict, articulating career growth, and demonstrating cultural values.",
    icon: Users,
    color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    badgeColor: "success",
    tag: "Core Round",
  },
  {
    type: "MANAGERIAL",
    title: "Managerial & Leadership",
    subtitle: "Strategy, delegation, scaling teams",
    description: "Evaluate your decision-making under ambiguity, roadmap prioritization, cross-functional alignment, and engineering mentorship.",
    icon: Briefcase,
    color: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
    badgeColor: "secondary",
    tag: "Senior / Lead",
  },
  {
    type: "APTITUDE",
    title: "Aptitude Assessment",
    subtitle: "Quantitative, logical, and verbal",
    description: "Timed, objectively-scored multi-choice test with real-time accuracy scoring and immediate rationale breakdown.",
    icon: Calculator,
    color: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    badgeColor: "warning",
    tag: "Timed Test",
  },
];

const DIFFICULTY_LEVELS = [
  { value: "JUNIOR", label: "Junior (0–2 yrs experience)" },
  { value: "INTERMEDIATE", label: "Mid-Level (2–5 yrs experience)" },
  { value: "SENIOR", label: "Senior (5–8 yrs experience)" },
  { value: "LEAD", label: "Staff / Lead (8+ yrs experience)" },
];

export default function InterviewHubPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [selectedTrack, setSelectedTrack] = useState<"HR" | "DOMAIN" | "MANAGERIAL" | "APTITUDE">("DOMAIN");
  const [selectedDomain, setSelectedDomain] = useState<string>("Software_Engineering");
  const [softwareSubFocus, setSoftwareSubFocus] = useState<string>("Fullstack");
  const [focusArea, setFocusArea] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("INTERMEDIATE");
  const [modality, setModality] = useState<"TEXT" | "VOICE">("TEXT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync domain preference from session
  useEffect(() => {
    if (session?.user?.domain) {
      if (
        ["Frontend", "Backend", "Fullstack", "AI_ML", "DevOps", "Mobile"].includes(
          session.user.domain
        )
      ) {
        setSelectedDomain("Software_Engineering");
        setSoftwareSubFocus(session.user.domain);
      } else {
        setSelectedDomain(session.user.domain);
      }
    }
  }, [session?.user?.domain]);

  const getFocusPlaceholder = () => {
    switch (selectedDomain) {
      case "Software_Engineering":
        return "e.g. React Performance, PostgreSQL Indexing, Microservices Architecture, Kafka";
      case "Data_Science":
        return "e.g. Transformer Architectures, Feature Selection, PyTorch, Model Drift & Monitoring";
      case "Data_Analytics":
        return "e.g. SQL Window Functions, PowerBI/Tableau Dashboards, ETL Pipelines, Cohort Retention";
      case "Cybersecurity":
        return "e.g. OWASP Top 10, Zero Trust, Threat Modeling, IAM, Incident Response Playbooks";
      case "Finance":
        return "e.g. Discounted Cash Flow (DCF), LBO Modeling, Risk-Weighted Assets, Capital Allocation";
      case "Accounting":
        return "e.g. GAAP Revenue Recognition (ASC 606), SOX Internal Controls, Tax Depreciation, Auditing";
      default:
        return "e.g. Core concepts, recent project architectures, industry standards";
    }
  };

  const handleStartInterview = async () => {
    setError(null);
    setLoading(true);

    try {
      const combinedFocus =
        selectedTrack === "DOMAIN" && selectedDomain === "Software_Engineering"
          ? [softwareSubFocus, focusArea.trim()].filter(Boolean).join(" - ")
          : focusArea.trim() || null;

      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedTrack,
          domain: selectedTrack === "DOMAIN" ? selectedDomain : null,
          focusArea: selectedTrack === "DOMAIN" ? combinedFocus : null,
          difficulty,
          modality,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.message || "Failed to initialize interview session.");
        setLoading(false);
        return;
      }

      router.push(`/interview/${data.data.sessionId}`);
    } catch {
      setError("Network or server error while starting interview.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-sky-200/30 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm shadow-sm shadow-blue-500/25 shrink-0" title="Home">
              AI
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
          <ThemeToggle />
        </div>

        {/* Page Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" /> AI Mock Interview Engine
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
            Configure Your Mock Interview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Choose an interview track, customize technical focus areas, and practice with real-time AI responses and adaptive follow-ups.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Select Track */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
            Select Interview Track
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRACKS.map((track) => {
              const Icon = track.icon;
              const isSelected = selectedTrack === track.type;
              return (
                <button
                  key={track.type}
                  type="button"
                  onClick={() => setSelectedTrack(track.type)}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? "border-blue-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-blue-500/25"
                      : "border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${track.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant={isSelected ? "primary" : "neutral"} className="text-[10px]">
                        {track.tag}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">{track.title}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{track.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed line-clamp-3">
                    {track.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Modality */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
            Select Interview Modality
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setModality("TEXT")}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                modality === "TEXT"
                  ? "border-blue-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-blue-500/25"
                  : "border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/60 hover:border-blue-300 hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${modality === "TEXT" ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20" : "bg-blue-100/70 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"}`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">Interactive Chat</h3>
                  <Badge variant={modality === "TEXT" ? "primary" : "neutral"} className="text-[10px]">
                    Text Mode
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Type responses at your own pace with real-time token streaming, code formatting, and thought time.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModality("VOICE")}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${
                modality === "VOICE"
                  ? "border-blue-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-blue-500/25"
                  : "border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/60 hover:border-blue-300 hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${modality === "VOICE" ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20" : "bg-blue-100/70 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"}`}>
                <Mic className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">Live Voice Interview</h3>
                  <Badge variant={modality === "VOICE" ? "primary" : "neutral"} className="text-[10px]">
                    Voice Mode
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Speak directly with the AI interviewer using your microphone with live speech recognition and voice playback.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Step 3: Track Options & Customization */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
              <CardTitle className="text-lg">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs mr-2 font-bold">3</span>
                Customize Round Parameters
              </CardTitle>
            </div>
            <CardDescription>
              Tailor the difficulty, engineering stack, and focus topics for this session.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className={`grid gap-5 ${selectedTrack === "DOMAIN" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
              {/* Seniority / Difficulty */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Seniority / Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/25 shadow-xs"
                >
                  {DIFFICULTY_LEVELS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Domain selector (if DOMAIN track selected) */}
              {selectedTrack === "DOMAIN" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Career Discipline / Domain</label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/25 shadow-xs"
                  >
                    {DOMAIN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Software Engineering Sub-Focus Area */}
            {selectedTrack === "DOMAIN" && selectedDomain === "Software_Engineering" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Software Engineering Sub-Track
                </label>
                <select
                  value={softwareSubFocus}
                  onChange={(e) => setSoftwareSubFocus(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/25 shadow-xs"
                >
                  {SOFTWARE_ENGINEERING_SUBFOCUS.map((sub) => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Focus Area */}
            {selectedTrack === "DOMAIN" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Specific Focus Topics <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder={getFocusPlaceholder()}
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  maxLength={100}
                  className="w-full h-10 px-3.5 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/25 shadow-xs placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400">
                  The AI interviewer will adapt its questions and architectural scenarios to probe these specific topics.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-700/60 pt-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Adaptive mock interviews stream token-by-token with real-time feedback.</span>
            </div>

            <Button
              onClick={handleStartInterview}
              isLoading={loading}
              loadingText="Initializing Room..."
              size="lg"
              className="w-full sm:w-auto flex items-center gap-2 shadow-sm shadow-blue-500/25 font-semibold px-7"
            >
              Start Interview Session <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}