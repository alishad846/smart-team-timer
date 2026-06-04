import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonWithCookies } from "@/lib/http";
import { getWorkspaceContext } from "@/lib/workspace";
import { summarizeTimeEntries } from "@/lib/time-metrics";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId") ?? context.organization.id;

  const [timeEntries, screenshots] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { organizationId },
      orderBy: { startedAt: "desc" }
    }),
    prisma.screenshot.findMany({
      where: { organizationId },
      orderBy: { capturedAt: "desc" },
      take: 20
    })
  ]);

  const { totalTrackedHours, productiveMinutes, idleMinutes, productivityScore } = summarizeTimeEntries(timeEntries);

  return jsonWithCookies(response, {
    analytics: {
      totalTrackedHours: Number(totalTrackedHours.toFixed(1)),
      focusPercentage: productivityScore,
      productivityScore,
      screenshotCount: screenshots.length,
      activeIdleRatio: productiveMinutes / Math.max(idleMinutes, 1)
    }
  });
}
