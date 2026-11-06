"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  LogIn, 
  UserPlus, 
  Briefcase, 
  FileText, 
  User,
  Menu,
  X,
  Compass
} from "lucide-react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 transition-colors relative overflow-x-hidden">
      {/* Background Ambient Decorative Waves & Dot Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Top-Left Dot Matrix */}
        <div className="absolute top-12 left-6 sm:left-10 w-48 h-40 opacity-40 dark:opacity-20">
          <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dot-grid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2.5" cy="2.5" r="1.5" className="fill-blue-400 dark:fill-blue-300" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />
          </svg>
        </div>

        {/* Soft Radial Gradient Glows */}
        <div className="absolute -top-32 -left-20 w-[480px] h-[480px] bg-blue-200/40 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-0 w-[600px] h-[600px] bg-sky-200/40 dark:bg-sky-500/10 rounded-full blur-3xl" />

        {/* Organic Flowing Curves (Right Swoosh) */}
        <svg
          className="absolute -top-12 right-0 w-[55vw] max-w-[800px] h-auto opacity-75 dark:opacity-25"
          viewBox="0 0 740 680"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M740 0C610 80 500 220 540 370C580 520 480 620 320 660C180 695 80 640 0 680H740V0Z"
            fill="url(#swooshGradientRight)"
            opacity="0.75"
          />
          <path
            d="M740 110C650 170 580 280 620 400C660 520 590 600 450 640H740V110Z"
            fill="url(#swooshGradientInner)"
            opacity="0.55"
          />
          <defs>
            <linearGradient id="swooshGradientRight" x1="740" y1="0" x2="250" y2="650" gradientUnits="userSpaceOnUse">
              <stop stopColor="#93C5FD" stopOpacity="0.55" />
              <stop offset="0.6" stopColor="#BFDBFE" stopOpacity="0.3" />
              <stop offset="1" stopColor="#DBEAFE" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="swooshGradientInner" x1="740" y1="110" x2="450" y2="640" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" stopOpacity="0.4" />
              <stop offset="1" stopColor="#93C5FD" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Organic Flowing Curve (Left Swoosh) */}
        <svg
          className="absolute top-48 -left-24 w-[36vw] max-w-[500px] h-auto opacity-60 dark:opacity-20"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 70C140 100 210 210 180 310C150 410 70 460 0 490V70Z"
            fill="url(#swooshGradientLeft)"
          />
          <defs>
            <linearGradient id="swooshGradientLeft" x1="0" y1="70" x2="200" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="#93C5FD" stopOpacity="0.35" />
              <stop offset="1" stopColor="#EFF6FF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Header / Navigation */}
      <header className="border-b border-blue-100/60 dark:border-slate-800 bg-white/70 dark:bg-[#0B1320]/70 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between gap-3">
          {/* Logo & Brand Name */}
          <Link href="/" className="flex items-center space-x-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm sm:text-base shrink-0 select-none shadow-sm shadow-blue-500/25">
              AI
            </div>
            <span className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
              Interview Prep Assistant
            </span>
          </Link>

          {/* Desktop Navigation Controls */}
          <div className="hidden sm:flex items-center space-x-2.5">
            <ThemeToggle />
            <Link href="/admin/login">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Admin
              </button>
            </Link>
            <Link href="/login">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Sign In
              </button>
            </Link>
            <Link href="/signup">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-all active:scale-[0.98]"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>

          {/* Mobile Navigation Controls */}
          <div className="flex sm:hidden items-center space-x-2 shrink-0">
            <ThemeToggle />
            <Link href="/signup">
              <button
                type="button"
                className="h-8 px-3 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs"
              >
                Get Started
              </button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors focus:outline-none"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200/70 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 space-y-3 shadow-lg">
            <div className="space-y-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <LogIn className="w-4 h-4 text-blue-600" /> Candidate Sign In
                </button>
              </Link>
              <Link href="/interview" onClick={() => setMobileMenuOpen(false)} className="block">
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/30 text-xs font-medium text-blue-600 dark:text-blue-400"
                >
                  <Briefcase className="w-4 h-4 text-blue-600" /> Adaptive Mock Interviews
                </button>
              </Link>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-blue-600 flex items-center gap-1.5 py-1"
              >
                <User className="w-3.5 h-3.5 text-amber-500" /> Admin Portal
              </Link>
              <Link
                href="/resume"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-blue-600 flex items-center gap-1.5 py-1"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500" /> Resume Scanner
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 sm:space-y-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto pt-2 pb-4 sm:pt-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50/90 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/80 text-xs font-medium text-blue-600 dark:text-blue-400 mb-6 shadow-xs select-none">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Next-Gen AI Interview & ATS Platform</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-heading font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.18]">
            Master Technical & HR Interviews
            <br className="hidden sm:inline" />
            {" "}with{" "}
            <span className="text-blue-600 dark:text-blue-400">Real-Time AI</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Practice adaptive mock interviews across HR, Aptitude, Managerial, and Domain tracks with real-time feedback, ATS resume optimization, and multi-factor security.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
            <Link href="/signup" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm sm:text-base shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Start Practicing Free <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto px-7 py-3 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-sm sm:text-base shadow-xs hover:shadow-sm transition-all active:scale-[0.98]"
              >
                Candidate Login
              </button>
            </Link>
          </div>
        </div>

        {/* Feature Cards Row (3 Cards matching mockup) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 pt-2">
          {/* Card 1: Adaptive Mock Interviews */}
          <Link href="/interview" className="block group h-full">
            <div className="h-full rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group-hover:border-blue-300 dark:group-hover:border-blue-600 relative">
              <div>
                <div className="w-11 h-11 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 shrink-0">
                  <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Adaptive Mock Interviews
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Simulate real technical and behavioral interviews with token-by-token streaming, contextual follow-ups, and tailored rubrics.
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center self-end mt-6 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Card 2: ATS Resume Scanner */}
          <Link href="/resume" className="block group h-full">
            <div className="h-full rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group-hover:border-emerald-300 dark:group-hover:border-emerald-600 relative">
              <div>
                <div className="w-11 h-11 rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 shrink-0">
                  <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  ATS Resume Scanner
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload your resume for job-targeted or general ATS scoring, keyword gap identification, and structural suggestions.
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center self-end mt-6 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Card 3: Secure Multi-Factor Auth */}
          <Link href="/signup" className="block group h-full">
            <div className="h-full rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group-hover:border-purple-300 dark:group-hover:border-purple-600 relative">
              <div>
                <div className="w-11 h-11 rounded-full bg-purple-100/70 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Secure Multi-Factor Auth
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Google OAuth, email/password authentication, Google Authenticator TOTP 2FA, and isolated zero-IP admin security.
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center self-end mt-6 group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Portal Navigation Container Card */}
        <div className="rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Left Accent Header */}
            <div className="flex items-start gap-3 lg:w-64 shrink-0">
              <div className="w-1.5 self-stretch min-h-[42px] bg-blue-600 rounded-full shrink-0" />
              <div>
                <h2 className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  Quick Portal Navigation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Direct shortcuts to application entry points
                </p>
              </div>
            </div>

            {/* Right Sub-Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              {/* Subcard 1: Candidate Login */}
              <Link
                href="/login"
                className="rounded-xl p-4 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 hover:border-blue-400/60 hover:bg-white dark:hover:bg-slate-900/80 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Candidate Login</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-10 leading-snug">
                    Sign in with Email/Password or Google
                  </p>
                </div>
                <div className="pt-3 pl-10">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open Login →
                  </span>
                </div>
              </Link>

              {/* Subcard 2: Candidate Registration */}
              <Link
                href="/signup"
                className="rounded-xl p-4 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 hover:border-purple-400/60 hover:bg-white dark:hover:bg-slate-900/80 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-full bg-purple-100/80 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Candidate Registration</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-10 leading-snug">
                    Create an account and choose your career domain
                  </p>
                </div>
                <div className="pt-3 pl-10">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Sign Up →
                  </span>
                </div>
              </Link>

              {/* Subcard 3: Admin Portal */}
              <Link
                href="/admin/login"
                className="rounded-xl p-4 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 hover:border-amber-400/60 hover:bg-white dark:hover:bg-slate-900/80 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-full bg-amber-100/80 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Admin Portal</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-10 leading-snug">
                    Privileged access with mandatory 2FA
                  </p>
                </div>
                <div className="pt-3 pl-10">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Admin Access →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-[#0B1320]/70 backdrop-blur-md py-6 text-xs text-slate-500 dark:text-slate-400 mt-auto relative z-10 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>AI Interview Preparation Assistant</span>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-blue-600 transition-colors">Candidate Login</Link>
            <Link href="/signup" className="hover:text-blue-600 transition-colors">Candidate Sign Up</Link>
            <Link href="/admin/login" className="hover:text-blue-600 transition-colors">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}