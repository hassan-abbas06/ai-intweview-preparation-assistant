import { prisma } from "@/lib/prisma";
import { Prisma, UserRole } from "@prisma/client";
import { getDomainLabel } from "@/lib/constants/domains";

// ============================================================================
// Types
// ============================================================================

export interface PaginatedResult<T> {
  rows: T[];
  page: number;
  pageSize: number;
  totalRows: number;
}

export interface UserDirectoryRow {
  id: string;
  email: string;
  domain: string | null;
  role: UserRole;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  interviewCount: number;
  atsScanCount: number;
}

export interface UserDirectoryParams {
  page: number;
  pageSize: number;
  search?: string;
  domain?: string;
}

export interface UserDomainDistributionItem {
  domain: string | null;
  label: string;
  count: number;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * 1. User Directory:
 * - Paginated list of registered users.
 * - Explicit select: id, email, domain, role, twoFactorEnabled, createdAt,
 *   and _count of sessions and atsScanLogs.
 * - NEVER selects passwordHash, twoFactorSecret, or googleId.
 * - Filters: search (case-insensitive email substring), domain (exact or "NOT_SET" for null).
 * - Stable order: createdAt desc, then id desc.
 * - Batch resolves lastLoginAt via a single groupBy on loginLog.
 */
export async function getUserDirectory(
  params: UserDirectoryParams
): Promise<PaginatedResult<UserDirectoryRow>> {
  const { page, pageSize, search, domain } = params;

  const safePage = Math.max(1, page || 1);
  const safePageSize = Math.max(1, pageSize || 10);
  const skip = (safePage - 1) * safePageSize;

  const where: Prisma.UserWhereInput = {};

  if (search && search.trim() !== "") {
    where.email = {
      contains: search.trim(),
      mode: "insensitive",
    };
  }

  if (domain !== undefined && domain !== "") {
    if (domain === "NOT_SET") {
      where.domain = null;
    } else {
      where.domain = domain;
    }
  }

  const [totalRows, rawUsers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        domain: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        _count: {
          select: {
            sessions: true,
            atsScanLogs: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: safePageSize,
    }),
  ]);

  const userIds = rawUsers.map((u) => u.id);
  const loginMap = new Map<string, Date>();

  if (userIds.length > 0) {
    const loginAgg = await prisma.loginLog.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        success: true,
        method: { in: ["CREDENTIALS", "GOOGLE"] },
      },
      _max: {
        timestamp: true,
      },
    });

    for (const item of loginAgg) {
      if (item.userId && item._max.timestamp) {
        loginMap.set(item.userId, item._max.timestamp);
      }
    }
  }

  const rows: UserDirectoryRow[] = rawUsers.map((user) => {
    const lastLogin = loginMap.get(user.id);
    return {
      id: user.id,
      email: user.email,
      domain: user.domain,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: lastLogin ? lastLogin.toISOString() : null,
      interviewCount: user._count.sessions,
      atsScanCount: user._count.atsScanLogs,
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
 * 2. User Domain Distribution:
 * - Groups registered users by domain with count.
 * - Labels converted using getDomainLabel or "Not set" when null.
 * - Aliases are not merged into core domains.
 * - Sorted by count desc.
 */
export async function getUserDomainDistribution(): Promise<UserDomainDistributionItem[]> {
  const groups = await prisma.user.groupBy({
    by: ["domain"],
    _count: {
      id: true,
    },
  });

  const result: UserDomainDistributionItem[] = groups.map((g) => {
    const domain = g.domain ?? null;
    const label = domain === null ? "Not set" : getDomainLabel(domain);
    return {
      domain,
      label,
      count: g._count.id,
    };
  });

  result.sort((a, b) => b.count - a.count);

  return result;
}
