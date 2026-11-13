import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface OverviewStats {
  totalUsers: number;
  activeToday: number;
  totalInterviews: number;
  totalAtsScans: number;
  avgAtsScore: number | null;
}

export interface LoginActivityParams {
  page: number;
  pageSize: number;
  method?: string;
  from?: Date | string;
  to?: Date | string;
}

export interface LoginActivityActor {
  type: "user" | "admin";
  email: string | null;
  userId?: string;
}

export interface LoginActivityRow {
  id: string;
  actor: LoginActivityActor;
  method: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResult<T> {
  rows: T[];
  page: number;
  pageSize: number;
  totalRows: number;
}

export interface DayCount {
  date: string;
  count: number;
}

export interface TypeCount {
  type: string;
  count: number;
}

export interface DomainCount {
  domain: string | null;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface InterviewActivityStats {
  byDay: DayCount[];
  byType: TypeCount[];
  byDomain: DomainCount[];
  byStatus: StatusCount[];
}

export interface ModeCount {
  mode: "job_targeted" | "general" | string;
  count: number;
}

export interface ScoreDistributionBucket {
  bucket: "0-40" | "40-70" | "70-100";
  count: number;
}

export interface AtsActivityStats {
  byDay: DayCount[];
  byMode: ModeCount[];
  scoreDistribution: ScoreDistributionBucket[];
}

export interface UserDrilldownUser {
  id: string;
  email: string;
  domain: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface UserDrilldownLogin {
  method: string;
  success: boolean;
  timestamp: string;
}

export interface UserDrilldownInterview {
  id: string;
  type: string;
  domain: string | null;
  status: string;
  startedAt: string;
  overallScore: number | null;
}

export interface UserDrilldownAtsScan {
  id: string;
  mode: "job_targeted" | "general" | string;
  score: number;
  timestamp: string;
}

export interface UserDrilldown {
  user: UserDrilldownUser;
  logins: UserDrilldownLogin[];
  interviews: UserDrilldownInterview[];
  atsScans: UserDrilldownAtsScan[];
}

// ============================================================================
// Custom Errors
// ============================================================================

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = "UserNotFoundError";
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * 1. Overview Stats:
 * - totalUsers = User.count()
 * - activeToday = count of DISTINCT userId in LoginLog where success = true, userId is not null, and timestamp >= start of today (server timezone)
 * - totalInterviews = InterviewSession.count()
 * - totalAtsScans = AtsScanLog.count()
 * - avgAtsScore = AtsScanLog.aggregate _avg score, returns null (never 0) when there are no scans.
 */
export async function getOverviewStats(): Promise<OverviewStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalUsers, activeTodayUsers, totalInterviews, totalAtsScans, atsAgg] =
    await Promise.all([
      prisma.user.count(),
      prisma.loginLog.findMany({
        where: {
          success: true,
          userId: { not: null },
          timestamp: { gte: startOfToday },
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      }),
      prisma.interviewSession.count(),
      prisma.atsScanLog.count(),
      prisma.atsScanLog.aggregate({
        _avg: {
          score: true,
        },
      }),
    ]);

  const activeToday = activeTodayUsers.length;
  const avgAtsScore = totalAtsScans === 0 ? null : (atsAgg._avg.score ?? null);

  return {
    totalUsers,
    activeToday,
    totalInterviews,
    totalAtsScans,
    avgAtsScore,
  };
}

/**
 * 2. Login Activity Log:
 * Explicit select of exactly: id, userId, adminId, method, success, timestamp.
 * Actor resolved via relation select of user.email / admin.email (type: "user" | "admin").
 * Order by timestamp desc, always paginate.
 * Throw Error if from > to.
 * STRICT RULE: No IP-related fields anywhere.
 */
export async function getLoginActivity(
  params: LoginActivityParams
): Promise<PaginatedResult<LoginActivityRow>> {
  const { page, pageSize, method, from, to } = params;

  const fromDate = from ? (from instanceof Date ? from : new Date(from)) : undefined;
  const toDate = to ? (to instanceof Date ? to : new Date(to)) : undefined;

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw new Error("Invalid date range: 'from' cannot be greater than 'to'");
  }

  const where: Prisma.LoginLogWhereInput = {};

  if (method && method.trim() !== "") {
    where.method = method.trim();
  }

  if (fromDate || toDate) {
    where.timestamp = {};
    if (fromDate) {
      where.timestamp.gte = fromDate;
    }
    if (toDate) {
      where.timestamp.lte = toDate;
    }
  }

  const safePage = Math.max(1, page || 1);
  const safePageSize = Math.max(1, pageSize || 10);
  const skip = (safePage - 1) * safePageSize;

  const [totalRows, rawLogs] = await Promise.all([
    prisma.loginLog.count({ where }),
    prisma.loginLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        adminId: true,
        method: true,
        success: true,
        timestamp: true,
        user: {
          select: {
            email: true,
          },
        },
        admin: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      skip,
      take: safePageSize,
    }),
  ]);

  const rows: LoginActivityRow[] = rawLogs.map((log) => {
    let actorType: "user" | "admin";
    if (log.userId) {
      actorType = "user";
    } else if (log.adminId) {
      actorType = "admin";
    } else {
      actorType = log.method === "ADMIN_CREDENTIALS" ? "admin" : "user";
    }

    const actorEmail = log.userId
      ? (log.user?.email ?? null)
      : (log.admin?.email ?? null);

    const actor: LoginActivityActor = {
      type: actorType,
      email: actorEmail,
      ...(actorType === "user" && log.userId ? { userId: log.userId } : {}),
    };

    return {
      id: log.id,
      actor,
      method: log.method,
      success: log.success,
      timestamp: log.timestamp.toISOString(),
    };
  });

  return {
    rows,
    page: safePage,
    pageSize: safePageSize,
    totalRows,
  };
}

/**
 * 3. Interview Activity:
 * - byDay: last 30 days grouped by day using raw SQL date_trunc('day', started_at) on interview_sessions
 * - byType, byDomain, byStatus: grouped from InterviewSession
 * BigInt counts converted to number. Empty DB returns 4 empty arrays.
 * Original enum string values kept. Null domain handled without crashing.
 */
export async function getInterviewActivity(): Promise<InterviewActivityStats> {
  const [byDayRaw, byTypeRaw, byDomainRaw, byStatusRaw] = await Promise.all([
    prisma.$queryRaw<Array<{ day: Date | string; count: bigint | number }>>`
      SELECT
        date_trunc('day', started_at) AS day,
        COUNT(*)::bigint AS count
      FROM interview_sessions
      WHERE started_at >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', started_at)
      ORDER BY day ASC
    `,
    prisma.interviewSession.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),
    prisma.interviewSession.groupBy({
      by: ["domain"],
      _count: { _all: true },
    }),
    prisma.interviewSession.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const byDay: DayCount[] = byDayRaw.map((r) => {
    const d = r.day instanceof Date ? r.day : new Date(r.day);
    return {
      date: d.toISOString().split("T")[0],
      count: Number(r.count),
    };
  });

  const byType: TypeCount[] = byTypeRaw.map((r) => ({
    type: r.type,
    count: r._count._all,
  }));

  const byDomain: DomainCount[] = byDomainRaw.map((r) => ({
    domain: r.domain ?? null,
    count: r._count._all,
  }));

  const byStatus: StatusCount[] = byStatusRaw.map((r) => ({
    status: r.status,
    count: r._count._all,
  }));

  return {
    byDay,
    byType,
    byDomain,
    byStatus,
  };
}

/**
 * 4. ATS Scan Activity:
 * - byDay: last 30 days grouped by day using raw SQL date_trunc('day', "timestamp") on ats_scan_logs
 * - byMode: grouped by mode, mapped to lowercase "job_targeted" | "general"
 * - scoreDistribution: three buckets ("0-40", "40-70", "70-100")
 */
export async function getAtsActivity(): Promise<AtsActivityStats> {
  const [byDayRaw, byModeRaw, c0_40, c40_70, c70_100] = await Promise.all([
    prisma.$queryRaw<Array<{ day: Date | string; count: bigint | number }>>`
      SELECT
        date_trunc('day', "timestamp") AS day,
        COUNT(*)::bigint AS count
      FROM ats_scan_logs
      WHERE "timestamp" >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', "timestamp")
      ORDER BY day ASC
    `,
    prisma.atsScanLog.groupBy({
      by: ["mode"],
      _count: { _all: true },
    }),
    prisma.atsScanLog.count({
      where: {
        score: {
          gte: 0,
          lt: 40,
        },
      },
    }),
    prisma.atsScanLog.count({
      where: {
        score: {
          gte: 40,
          lt: 70,
        },
      },
    }),
    prisma.atsScanLog.count({
      where: {
        score: {
          gte: 70,
          lte: 100,
        },
      },
    }),
  ]);

  const byDay: DayCount[] = byDayRaw.map((r) => {
    const d = r.day instanceof Date ? r.day : new Date(r.day);
    return {
      date: d.toISOString().split("T")[0],
      count: Number(r.count),
    };
  });

  const byMode: ModeCount[] = byModeRaw.map((r) => ({
    mode: r.mode.toLowerCase() as "job_targeted" | "general",
    count: r._count._all,
  }));

  const scoreDistribution: ScoreDistributionBucket[] = [
    { bucket: "0-40", count: c0_40 },
    { bucket: "40-70", count: c40_70 },
    { bucket: "70-100", count: c70_100 },
  ];

  return {
    byDay,
    byMode,
    scoreDistribution,
  };
}

/**
 * 5. User Drilldown:
 * If user does not exist, throws UserNotFoundError.
 * EXPLICIT select of ONLY: id, email, domain, twoFactorEnabled, createdAt.
 * NEVER selects passwordHash, twoFactorSecret, or googleId.
 * logins: most recent 50 LoginLog rows for this user (method, success, timestamp).
 * interviews: this user's InterviewSession rows with id, type, domain, status, startedAt, and overallScore from report.
 * atsScans: this user's AtsScanLog rows with id, mode (lowercase), score, timestamp.
 */
export async function getUserDrilldown(userId: string): Promise<UserDrilldown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      domain: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new UserNotFoundError(userId);
  }

  const [loginsRaw, interviewsRaw, atsScansRaw] = await Promise.all([
    prisma.loginLog.findMany({
      where: { userId },
      select: {
        method: true,
        success: true,
        timestamp: true,
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    }),
    prisma.interviewSession.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        domain: true,
        status: true,
        startedAt: true,
        report: {
          select: {
            overallScore: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.atsScanLog.findMany({
      where: { userId },
      select: {
        id: true,
        mode: true,
        score: true,
        timestamp: true,
      },
      orderBy: { timestamp: "desc" },
    }),
  ]);

  const userObj: UserDrilldownUser = {
    id: user.id,
    email: user.email,
    domain: user.domain,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt.toISOString(),
  };

  const logins: UserDrilldownLogin[] = loginsRaw.map((l) => ({
    method: l.method,
    success: l.success,
    timestamp: l.timestamp.toISOString(),
  }));

  const interviews: UserDrilldownInterview[] = interviewsRaw.map((s) => ({
    id: s.id,
    type: s.type,
    domain: s.domain,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    overallScore: s.report?.overallScore ?? null,
  }));

  const atsScans: UserDrilldownAtsScan[] = atsScansRaw.map((a) => ({
    id: a.id,
    mode: a.mode.toLowerCase() as "job_targeted" | "general",
    score: a.score,
    timestamp: a.timestamp.toISOString(),
  }));

  return {
    user: userObj,
    logins,
    interviews,
    atsScans,
  };
}
