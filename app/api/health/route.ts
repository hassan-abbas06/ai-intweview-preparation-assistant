import { successResponse } from "@/lib/api-response";

export async function GET() {
  return successResponse(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    "Service is operational"
  );
}
