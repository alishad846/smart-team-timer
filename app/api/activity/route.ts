import { NextRequest, NextResponse } from "next/server";
import { subHours } from "date-fns";
import { prisma } from "@/lib/prisma";
import { activityLogSchema } from "@/lib/validators";
import { jsonWithCookies } from "@/lib/http";
import { getWorkspaceContext } from "@/lib/workspace";
import { isTrackerRequest } from "@/lib/tracker-auth";

const IDLE_THRESHOLD_SECONDS = 60;

function deriveDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^www\./, "").split("/")[0] || "unknown";
  }
}

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId") ?? context.organization.id;
  const userId = request.nextUrl.searchParams.get("userId") ?? context.profile.id;

  const logs = await prisma.activityLog.findMany({
    where: {
      organizationId,
      userId,
      capturedAt: {
        gte: subHours(new Date(), 24)
      }
    },
    orderBy: { capturedAt: "desc" },
    take: 60
  });

  return jsonWithCookies(response, { logs });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const body = await request.json();
  const logsPayload: unknown[] = Array.isArray(body.logs) ? body.logs : [body];
  const parsedLogs = logsPayload.map((item) => activityLogSchema.safeParse(item));

  if (parsedLogs.some((result) => !result.success)) {
    return jsonWithCookies(response, { error: "Invalid payload" }, { status: 400 });
  }

  const trackerRequest = isTrackerRequest(request);
  const context = trackerRequest ? null : await getWorkspaceContext();

  if (!context && !trackerRequest) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const firstLog = parsedLogs[0]?.success ? parsedLogs[0].data : null;

  if (trackerRequest) {
    if (!firstLog) {
      return jsonWithCookies(response, { error: "Invalid payload" }, { status: 400 });
    }

    const membership = await prisma.teamMember.findFirst({
      where: {
        organizationId: firstLog.organizationId,
        userId: firstLog.userId
      }
    });

    if (!membership) {
      return jsonWithCookies(response, { error: "Tracker user not found in workspace" }, { status: 404 });
    }

    if (membership.consentStatus !== "ACCEPTED") {
      return jsonWithCookies(
        response,
        { error: "Tracking permission is required before activity can be stored." },
        { status: 403 }
      );
    }
  } else if (context && firstLog && (context.profile.id !== firstLog.userId || context.organization.id !== firstLog.organizationId)) {
    return jsonWithCookies(response, { error: "Forbidden" }, { status: 403 });
  }

  if (context && context.membership.consentStatus !== "ACCEPTED") {
    return jsonWithCookies(
      response,
      { error: "Tracking permission is required before activity can be stored." },
      { status: 403 }
    );
  }

  const logs = await prisma.activityLog.createMany({
    data: parsedLogs.map((result) => {
      const log = result.success ? result.data : null;
      if (!log) {
        throw new Error("Unexpected invalid activity log");
      }
      return {
        userId: log.userId,
        organizationId: log.organizationId,
        teamId: log.teamId ?? (context?.membership.teamId ?? null),
        activeApp: log.activeApp,
        activeWindow: log.activeWindow,
        website: log.website,
        keyboardPercent: Math.round(log.keyboardPercent),
        mousePercent: Math.round(log.mousePercent),
        idleSeconds: Math.round(log.idleSeconds),
        trackingState: log.trackingState,
        capturedAt: log.capturedAt ? new Date(log.capturedAt) : new Date()
      };
    })
  });

  await Promise.all([
    prisma.appUsage.createMany({
      data: parsedLogs.map((result) => {
        const log = result.success ? result.data : null;
        if (!log) {
          throw new Error("Unexpected invalid activity log");
        }

        return {
          userId: log.userId,
          organizationId: log.organizationId,
          teamId: log.teamId ?? (context?.membership.teamId ?? null),
          appName: log.activeApp,
          windowTitle: log.activeWindow,
          durationSeconds: 30,
          capturedAt: log.capturedAt ? new Date(log.capturedAt) : new Date()
        };
      })
    }),
    prisma.websiteUsage.createMany({
      data: parsedLogs
        .map((result) => {
          const log = result.success ? result.data : null;
          if (!log || !log.website) {
            return null;
          }

          return {
            userId: log.userId,
            organizationId: log.organizationId,
            teamId: log.teamId ?? (context?.membership.teamId ?? null),
            domain: deriveDomain(log.website),
            url: log.website,
            durationSeconds: 30,
            visits: 1,
            capturedAt: log.capturedAt ? new Date(log.capturedAt) : new Date()
          };
        })
        .filter(Boolean) as any
    })
  ]);

  const activeEntry = await prisma.timeEntry.findFirst({
    where: {
      userId: firstLog?.userId ?? context?.profile.id,
      organizationId: firstLog?.organizationId ?? context?.organization.id,
      status: "RUNNING"
    },
    orderBy: { updatedAt: "desc" }
  });

  if (activeEntry) {
    const batchSeconds = 30 * parsedLogs.length;
    const idleSeconds = parsedLogs.reduce((sum, result) => {
      const log = result.success ? result.data : null;
      if (!log) {
        return sum;
      }

      return sum + (log.trackingState === "IDLE" || log.idleSeconds >= IDLE_THRESHOLD_SECONDS ? 30 : 0);
    }, 0);
    const productiveSeconds = Math.max(0, batchSeconds - idleSeconds);

    await prisma.timeEntry.update({
      where: { id: activeEntry.id },
      data: {
        totalSeconds: activeEntry.totalSeconds + batchSeconds,
        productiveSeconds: activeEntry.productiveSeconds + productiveSeconds,
        idleSeconds: activeEntry.idleSeconds + idleSeconds
      }
    });
  }

  return jsonWithCookies(response, { created: logs.count }, { status: 201 });
}
