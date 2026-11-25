import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { jsonWithCookies } from "@/lib/http";
import { subHours } from "date-fns";
import { summarizeTimeEntries } from "@/lib/time-metrics";

export async function GET(request: NextRequest) {
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(new NextResponse(), { error: "Unauthorized" }, { status: 401 });
  }

  if (context.workspaceRole !== "admin") {
    return jsonWithCookies(new NextResponse(), { error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const size = Math.min(Number(searchParams.get("size")) || 20, 50);
  const skip = (page - 1) * size;

  const [members, totalMembers, timeEntries, activityLogs, screenshots] = await Promise.all([
    prisma.teamMember.findMany({
      where: { organizationId: context.organization.id, status: { not: "REMOVED" } },
      include: { user: { select: { id: true, fullName: true, email: true, githubUsername: true } }, team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: size,
    }),
    prisma.teamMember.count({
      where: { organizationId: context.organization.id, status: { not: "REMOVED" } },
    }),
    prisma.timeEntry.findMany({
      where: { organizationId: context.organization.id },
      select: { userId: true, productiveSeconds: true, idleSeconds: true, totalSeconds: true, startedAt: true },
      orderBy: { startedAt: "desc" },
      take: 500,
    }),
    prisma.activityLog.findMany({
      where: {
        organizationId: context.organization.id,
        capturedAt: { gte: subHours(new Date(), 24) },
      },
      select: { userId: true, capturedAt: true, idleSeconds: true },
      orderBy: { capturedAt: "desc" },
      take: 60,
    }),
    prisma.screenshot.findMany({
      where: { organizationId: context.organization.id },
      select: { id: true, user: { select: { fullName: true } }, activeApp: true, activeWindow: true, capturedAt: true },
      orderBy: { capturedAt: "desc" },
      distinct: ["userId"],
      take: 50,
    }),
  ]);

  const { totalTrackedHours, productiveMinutes, idleMinutes, productivityScore } = summarizeTimeEntries(timeEntries);
  const lowActivityCount = activityLogs.filter((log) => log.idleSeconds > 15 * 60).length;

  const memberStats = members
    .map((member: any) => {
      const employeeEntries = timeEntries.filter((entry) => entry.userId === member.userId);
      const productive = employeeEntries.reduce((sum: number, entry) => sum + entry.productiveSeconds, 0);
      const idle = employeeEntries.reduce((sum: number, entry) => sum + entry.idleSeconds, 0);
      const score = productive + idle > 0 ? Math.round((productive / (productive + idle)) * 100) : 0;
      return {
        id: member.userId,
        name: (member as any).user?.fullName ?? "",
        team: (member as any).team?.name ?? "Unassigned",
        githubUsername: (member as any).user?.githubUsername ?? "",
        score,
        consentStatus: member.consentStatus,
      };
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  return jsonWithCookies(new NextResponse(), {
    members: memberStats,
    totalMembers,
    page,
    size,
    totalPages: Math.ceil(totalMembers / size),
    totalTrackedHours,
    productiveMinutes,
    idleMinutes,
    productivityScore,
    lowActivityCount,
    screenshots,
  });
}