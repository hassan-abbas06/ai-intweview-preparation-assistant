import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth/admin-session";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getUserDrilldown, UserNotFoundError } from "@/lib/admin/stats-queries";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return errorResponse("Unauthorized. Admin session required.", 401);
  }

  try {
    const data = await getUserDrilldown(params.userId);
    return successResponse(data, "User activity");
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return errorResponse("User not found.", 404);
    }
    return errorResponse("Failed to load user activity.", 500, err);
  }
}
