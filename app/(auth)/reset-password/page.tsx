"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-rose-500 mb-1">
            <AlertCircle className="w-5 h-5" />
            <CardTitle>Invalid Reset Link</CardTitle>
          </div>
          <CardDescription>
            No reset token was provided in the link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            The link you followed is incomplete or invalid. Please request a fresh password reset link.
          </p>
          <Link href="/forgot-password" className="block w-full">
            <Button variant="primary" className="w-full text-xs rounded-full">
              Request New Reset Link
            </Button>
          </Link>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
          <Link href="/login" className="text-xs text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.message || "Failed to reset password. The link may have expired.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 2000);
    } catch {
      setError("Network or server error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
          <Lock className="w-5 h-5" />
          <CardTitle>Set New Password</CardTitle>
        </div>
        <CardDescription>
          Enter and confirm your new account password (minimum 8 characters).
        </CardDescription>
      </CardHeader>

      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Password Updated</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Your password has been changed successfully. Redirecting to login...
                </p>
              </div>
            </div>
            <Link href="/login" className="block w-full">
              <Button className="w-full text-xs rounded-full">Go to Sign In Now</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password (min 8 chars)</label>
              <PasswordInput
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                autoComplete="new-password"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
              <PasswordInput
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? "Updating password..." : "Update Password"}
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
  );
}

export default function ResetPasswordPage() {
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
            Choose a New Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Secure your candidate account credentials
          </p>
        </div>

        <Suspense fallback={<div className="text-sm text-slate-500 text-center">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}