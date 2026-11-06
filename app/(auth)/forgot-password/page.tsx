"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { KeyRound, ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.message || "Failed to process password reset request.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setLoading(false);
    } catch {
      setError("Network or server error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-14 sm:pt-4 bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-sky-200/30 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm shadow-sm shadow-blue-500/25">
              AI
            </div>
            <span className="font-heading font-bold text-base text-slate-900 dark:text-white">
              Interview Prep Assistant
            </span>
          </Link>
          <h1 className="font-heading font-bold text-2xl text-slate-900 dark:text-white tracking-tight">
            Account Recovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Request a time-limited password reset link
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <KeyRound className="w-5 h-5" />
              <CardTitle className="text-lg">Forgot Password</CardTitle>
            </div>
            <CardDescription>
              Enter the email address associated with your account and we will send you a reset link.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitted ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm flex items-start gap-3">
                  <MailCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">Check your email</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      If an account exists for <strong className="text-slate-900 dark:text-white">{email}</strong>, a reset link has been dispatched. The link expires in 20 minutes.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 text-center">
                  Did not receive an email? Check your spam folder or try requesting again.
                </p>

                <Button
                  variant="outline"
                  className="w-full text-xs rounded-full"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                >
                  Send Another Link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <Button type="submit" className="w-full rounded-full" disabled={loading}>
                  {loading ? "Sending reset link..." : "Send Password Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
            <Link
              href="/login"
              className="text-xs text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Candidate Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}