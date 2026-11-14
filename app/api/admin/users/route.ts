import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getUserDirectory } from "@/lib/admin/user-directory-queries";

export const dynamic = "force-dynamic";

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

    // 3. Parse search (optional, trimmed, max 100 characters)
    let search: string | undefined;
    const searchParam = searchParams.get("search");
    if (searchParam !== null) {
      const trimmed = searchParam.trim();
      if (trimmed.length > 100) {
        return errorResponse("Invalid 'search' parameter. Must be 100 characters or fewer.", 400);
      }
      if (trimmed.length > 0) {
        search = trimmed;
      }
    }

    // 4. Parse domain (optional; must be exactly "NOT_SET" or match /^[A-Za-z0-9_]{1,50}$/)
    let domain: string | undefined;
    const domainParam = searchParams.get("domain");
    if (domainParam !== null && domainParam !== "") {
      if (domainParam !== "NOT_SET" && !/^[A-Za-z0-9_]{1,50}$/.test(domainParam)) {
        return errorResponse("Invalid 'domain' parameter.", 400);
      }
      domain = domainParam;
    }

    const data = await getUserDirectory({
      page,
      pageSize,
      search,
      domain,
    });

    return successResponse(data, "User directory");
  } catch (err) {
    return errorResponse("Failed to load user directory.", 500, err);
  }
}
