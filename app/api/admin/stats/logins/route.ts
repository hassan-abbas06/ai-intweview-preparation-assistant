import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getLoginActivity } from "@/lib/admin/stats-queries";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS = ["CREDENTIALS", "GOOGLE", "ADMIN_CREDENTIALS"] as const;
type AllowedMethod = (typeof ALLOWED_METHODS)[number];

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return errorResponse("Unauthorized. Admin session required.", 401);
  }

  try {
    const { searchParams } = new URL(request.url);

    // 1. Parse page (default: 1, must be positive integer)
    let page = 1;
    const pageParam = searchParams.get("page");
    if (pageParam !== null && pageParam !== "") {
      const parsedPage = Number(pageParam);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return errorResponse("Invalid 'page' parameter. Must be a positive integer.", 400);
      }
      page = parsedPage;
    }

    // 2. Parse pageSize (default: 25, positive integer, clamped to 100)
    let pageSize = 25;
    const pageSizeParam = searchParams.get("pageSize");
    if (pageSizeParam !== null && pageSizeParam !== "") {
      const parsedPageSize = Number(pageSizeParam);
      if (!Number.isInteger(parsedPageSize) || parsedPageSize < 1) {
        return errorResponse("Invalid 'pageSize' parameter. Must be a positive integer.", 400);
      }
      pageSize = Math.min(100, parsedPageSize);
    }

    // 3. Parse method (optional, must be one of allowed enum values)
    let method: string | undefined;
    const methodParam = searchParams.get("method");
    if (methodParam !== null && methodParam !== "") {
      if (!ALLOWED_METHODS.includes(methodParam as AllowedMethod)) {
        return errorResponse(
          "Invalid 'method' parameter. Must be one of: CREDENTIALS, GOOGLE, ADMIN_CREDENTIALS.",
          400
        );
      }
      method = methodParam;
    }

    // 4. Parse from / to dates
    let fromDate: Date | undefined;
    const fromParam = searchParams.get("from");
    if (fromParam !== null && fromParam !== "") {
      fromDate = new Date(fromParam);
      if (isNaN(fromDate.getTime())) {
        return errorResponse("Invalid 'from' date parameter.", 400);
      }
    }

    let toDate: Date | undefined;
    const toParam = searchParams.get("to");
    if (toParam !== null && toParam !== "") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
        // Date-only string: treat as end of day (23:59:59.999Z) so the entire day is included
        toDate = new Date(`${toParam}T23:59:59.999Z`);
      } else {
        toDate = new Date(toParam);
      }
      if (isNaN(toDate.getTime())) {
        return errorResponse("Invalid 'to' date parameter.", 400);
      }
    }

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      return errorResponse("Invalid date range: 'from' cannot be after 'to'.", 400);
    }

    const data = await getLoginActivity({
      page,
      pageSize,
      method,
      from: fromDate,
      to: toDate,
    });

    return successResponse(data, "Login activity");
  } catch (err) {
    return errorResponse("Failed to load login activity.", 500, err);
  }
}
