import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return errorResponse("Unauthorized. Please sign in first.", 401);
    }

    // Retrieve database user
    let user = session.user.id
      ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
      : null;

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.trim().toLowerCase() },
        select: { id: true },
      });
    }

    if (!user) {
      return errorResponse("Candidate account not found.", 404);
    }

    // Find requesting user's most recent AtsScanLog with non-empty jdText
    const recentScans = await prisma.atsScanLog.findMany({
      where: {
        userId: user.id,
        jdText: { not: null },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: {
        id: true,
        jdText: true,
        timestamp: true,
      },
    });

    const validScan = recentScans.find((s) => s.jdText && s.jdText.trim().length > 0);

    if (!validScan || !validScan.jdText) {
      return successResponse(null, "No recent targeted resume scan found.");
    }

    const trimmedJdText = validScan.jdText.trim();

    // Check for an existing JobDescription for the same user matching this rawText
    let matchedJd = await prisma.jobDescription.findFirst({
      where: {
        userId: user.id,
        rawText: trimmedJdText,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!matchedJd) {
      const candidateJds = await prisma.jobDescription.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      matchedJd = candidateJds.find((jd) => jd.rawText.trim() === trimmedJdText) || null;
    }

    if (matchedJd) {
      let skills: string[] = [];
      if (Array.isArray(matchedJd.extractedSkills)) {
        skills = matchedJd.extractedSkills.map(String).filter(Boolean);
      } else if (typeof matchedJd.extractedSkills === "string") {
        try {
          const parsed = JSON.parse(matchedJd.extractedSkills);
          if (Array.isArray(parsed)) skills = parsed.map(String).filter(Boolean);
        } catch {}
      }

      let responsibilities: string[] = [];
      if (Array.isArray(matchedJd.extractedResponsibilities)) {
        responsibilities = matchedJd.extractedResponsibilities.map(String).filter(Boolean);
      } else if (typeof matchedJd.extractedResponsibilities === "string") {
        try {
          const parsed = JSON.parse(matchedJd.extractedResponsibilities);
          if (Array.isArray(parsed)) responsibilities = parsed.map(String).filter(Boolean);
        } catch {}
      }

      return successResponse(
        {
          source: "existing",
          jobDescriptionId: matchedJd.id,
          role: matchedJd.extractedRole,
          seniority: matchedJd.extractedSeniority,
          skills,
          responsibilities,
          confidence: matchedJd.extractionConfidence,
          scannedAt: validScan.timestamp.toISOString(),
        },
        "Found existing analyzed job description."
      );
    }

    // Found in scan log but not yet analyzed as a JobDescription
    return successResponse(
      {
        source: "scan",
        jdText: validScan.jdText,
        scannedAt: validScan.timestamp.toISOString(),
      },
      "Found recent resume scan job description."
    );
  } catch (err) {
    console.error("[API Error] Failed to retrieve recent JD:", err);
    return errorResponse("Failed to retrieve recent job description.", 500, err);
  }
}
