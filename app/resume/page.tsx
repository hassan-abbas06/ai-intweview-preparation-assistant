"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Search,
  Award,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function ResumePage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showDemoResult, setShowDemoResult] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
    }
  };

  const handleScan = () => {
    if (!selectedFileName) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setShowDemoResult(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-emerald-200/30 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" /> ATS Resume Scanner & Optimizer
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
            ATS Resume Scanner
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Upload your resume to calculate keyword match scores, identify structural ATS parsing gaps, and align bullet points with target role expectations.
          </p>
        </div>

        {/* Upload & JD Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Resume Upload Dropzone */}
          <Card className="shadow-sm flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Upload Resume</CardTitle>
                  <CardDescription>PDF or DOCX format (Max 10MB)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragActive
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-2.5 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  {selectedFileName ? (
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{selectedFileName}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Ready to analyze</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PDF or DOCX (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={handleScan}
                disabled={!selectedFileName || isScanning}
                isLoading={isScanning}
                loadingText="Analyzing ATS compatibility..."
                size="md"
                className="w-full text-xs rounded-full font-semibold shadow-sm shadow-blue-500/25"
              >
                Scan Resume with AI <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2: Target Job Description */}
          <Card className="shadow-sm flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Target Job Description</CardTitle>
                  <CardDescription>Paste the job posting to calculate match rate (Optional)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description, responsibilities, and required qualifications here..."
                rows={6}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 resize-none shadow-xs"
              />
              <p className="text-[11px] text-slate-400">
                Aligning against a specific JD reveals exact keyword deficits and ranking weights.
              </p>
            </CardContent>
            <CardFooter className="pt-2 flex justify-between items-center text-xs text-slate-400">
              <span>{jobDescription.length} characters</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFileName("Sample_Senior_Software_Engineer_Resume.pdf");
                  setJobDescription(
                    "We are seeking a Senior Fullstack Engineer with 5+ years of experience in React, TypeScript, Next.js, PostgreSQL, Distributed Systems, and Kafka."
                  );
                  setShowDemoResult(true);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Load Sample Data
              </button>
            </CardFooter>
          </Card>
        </div>

        {/* Analysis Results View */}
        {showDemoResult && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900 dark:text-white">
              ATS Scan Results
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Card className="shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">ATS Match Score</span>
                    <p className="text-2xl font-black font-heading text-slate-900 dark:text-white">88 / 100</p>
                    <Badge variant="success" className="text-[10px] mt-1">High Compatibility</Badge>
                  </div>
                </div>
              </Card>

              <Card className="shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Keywords Detected</span>
                    <p className="text-2xl font-black font-heading text-slate-900 dark:text-white">18 / 22</p>
                    <Badge variant="primary" className="text-[10px] mt-1">82% Coverage</Badge>
                  </div>
                </div>
              </Card>

              <Card className="shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Keyword Gaps</span>
                    <p className="text-2xl font-black font-heading text-slate-900 dark:text-white">4 Missing</p>
                    <Badge variant="warning" className="text-[10px] mt-1">Optimization Opportunity</Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Keyword breakdown card */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Target Keyword Breakdown</CardTitle>
                <CardDescription>Critical skills parsed from the job description vs your resume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Matched Competencies:</span>
                  <div className="flex flex-wrap gap-2">
                    {["React.js", "TypeScript", "Next.js", "PostgreSQL", "REST APIs", "Git", "Jest", "State Management", "CI/CD", "Docker"].map((skill) => (
                      <span key={skill} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Missing Priority Keywords:</span>
                  <div className="flex flex-wrap gap-2">
                    {["Kafka / Event Streaming", "Distributed Tracing", "Kubernetes", "GraphQL"].map((skill) => (
                      <span key={skill} className="px-3 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/60 text-rose-700 dark:text-rose-300">
                        + {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">Ready to test these skills in a live mock interview?</span>
                <Link href="/interview">
                  <Button size="sm" className="text-xs rounded-full px-5">
                    Start Mock Interview →
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}