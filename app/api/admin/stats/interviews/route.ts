import { getAdminSession } from "@/lib/auth/admin-session";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getInterviewActivity } from "@/lib/admin/stats-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return errorResponse("Unauthorized. Admin session required.", 401);
  }

  try {
    const data = await getInterviewActivity();
    return successResponse(data, "Interview activity");
  } catch (err) {
    return errorResponse("Failed to load interview activity.", 500, err);
  }
}
