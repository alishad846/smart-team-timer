import { NextRequest, NextResponse } from "next/server";
import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { buildAiSummary } from "@/lib/analytics";
import { jsonWithCookies } from "@/lib/http";
import { getWorkspaceContext } from "@/lib/workspace";
import { summarizeTimeEntries } from "@/lib/time-metrics";

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const organizationId = (body.organizationId as string | undefined) ?? context.organization.id;
  const userId = (body.userId as string | undefined) ?? context.profile.id;

  const [timeEntries, activityLogs] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { organizationId, userId },
      take: 50,
      orderBy: { startedAt: "desc" }
    }),
    prisma.activityLog.findMany({
      where: {
        organizationId,
        userId,
        capturedAt: {
          gte: subHours(new Date(), 24)
        }
      },
      take: 60,
      orderBy: { capturedAt: "desc" }
    })
  ]);

  const { productiveMinutes, idleMinutes } = summarizeTimeEntries(timeEntries);
  const focusSessions = timeEntries.filter((entry) => entry.totalSeconds >= 25 * 60).length;
  const appSwitches = activityLogs.length;
  const lowActivityWindows = activityLogs
    .filter((log) => log.idleSeconds > 15 * 60)
    .map((log) => new Date(log.capturedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    .slice(0, 3);

  const summary = buildAiSummary({
    productiveMinutes,
    idleMinutes,
    focusSessions,
    appSwitches,
    lowActivityWindows
  });

  const stored = await prisma.dailySummary.create({
    data: {
      userId,
      organizationId,
      teamId: body.teamId,
      summaryDate: new Date(),
      summaryText: summary.summary,
      productivityScore: summary.score,
      insightsJson: summary.insights
    }
  });

  return jsonWithCookies(response, { summary: stored });
}
