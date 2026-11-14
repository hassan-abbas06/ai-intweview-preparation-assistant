import { getAdminSession } from "@/lib/auth/admin-session";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getUserDomainDistribution } from "@/lib/admin/user-directory-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return errorResponse("Unauthorized. Admin session required.", 401);
  }

  try {
    const distribution = await getUserDomainDistribution();
    const totalUsers = distribution.reduce((sum, item) => sum + item.count, 0);

    return successResponse(
      { distribution, totalUsers },
      "User domain distribution"
    );
  } catch (err) {
    return errorResponse("Failed to load user domain distribution.", 500, err);
  }
}
