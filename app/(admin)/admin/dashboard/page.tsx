"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldAlert, LogOut, Users, Activity, BarChart3, Clock, CheckCircle2 } from "lucide-react";

interface AdminData {
  adminId: string;
  email: string;
  role: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdmin() {
      try {
        const res = await fetch("/api/admin/auth/me");
        const data = await res.json();
        if (res.ok && !data.error) {
          setAdmin(data.data);
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }
    fetchAdmin();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F6F9FD] dark:bg-[#0B1320]">
        <p className="text-xs sm:text-sm text-slate-500 animate-pulse">Verifying isolated admin session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FD] dark:bg-[#0B1320] text-slate-900 dark:text-slate-100 p-4 sm:p-8 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-amber-200/30 dark:bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-200/30 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Top bar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200/80 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-heading font-extrabold text-sm shadow-sm shadow-blue-500/25 shrink-0" title="Home">
              AI
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white">Admin Control Center</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authenticated as <span className="font-mono font-medium text-slate-900 dark:text-white">{admin?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 border-rose-200/80 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full px-4 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Admin Sign Out
            </Button>
          </div>
        </header>

        {/* Security & Scope confirmation card */}
        <Card className="border-blue-200/80 dark:border-blue-900/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Privileged Session Scope</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="warning">{admin?.role || "SUPERADMIN"}</Badge>
                <Badge variant="success">TOTP 2FA Verified</Badge>
              </div>
            </div>
            <CardDescription>
              Session isolated strictly from candidate auth scope. Expiring in 8 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Zero IP Logging</p>
                  <p className="text-slate-500 dark:text-slate-400">All logins audited without IP tracking.</p>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">8-Hour Lifetime</p>
                  <p className="text-slate-500 dark:text-slate-400">Tight cookie expiration for security.</p>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Mandatory 2FA</p>
                  <p className="text-slate-500 dark:text-slate-400">Enforced on all administrator logins.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics preview cards */}
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white mb-4">Management Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" /> User Directory
                  </CardTitle>
                  <Badge variant="secondary">Phase 8</Badge>
                </div>
                <CardDescription>
                  View registered candidates, domains, 2FA status, and account actions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" /> Interview Analytics
                  </CardTitle>
                  <Badge variant="secondary">Phase 8</Badge>
                </div>
                <CardDescription>
                  Track mock interview sessions across HR, Aptitude, Managerial, and Domain.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" /> ATS Scan Metrics
                  </CardTitle>
                  <Badge variant="secondary">Phase 8</Badge>
                </div>
                <CardDescription>
                  Monitor resume score distribution and job-targeted vs general scans.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}