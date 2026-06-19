import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { jsonWithCookies } from "@/lib/http";

const DEFAULT_IDLE_SECONDS = 60;

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  if (context.membership.consentStatus !== "ACCEPTED") {
    return jsonWithCookies(
      response,
      { error: "Tracking permission is required before idle time can be stored." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const idleSeconds = Math.max(
    DEFAULT_IDLE_SECONDS,
    Number.isFinite(body?.idleSeconds) ? Math.round(body.idleSeconds) : DEFAULT_IDLE_SECONDS
  );

  const activeEntry = await prisma.timeEntry.findFirst({
    where: {
      userId: context.profile.id,
      organizationId: context.organization.id,
      status: "RUNNING"
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!activeEntry) {
    return jsonWithCookies(response, { error: "No active running timer found" }, { status: 404 });
  }

  const updatedEntry = await prisma.timeEntry.update({
    where: { id: activeEntry.id },
    data: {
      totalSeconds: activeEntry.totalSeconds + idleSeconds,
      idleSeconds: activeEntry.idleSeconds + idleSeconds
    }
  });

  await prisma.activityLog.create({
    data: {
      userId: context.profile.id,
      organizationId: context.organization.id,
      teamId: context.membership.teamId,
      activeApp: "Browser idle",
      activeWindow: "No mouse or keyboard movement",
      website: "",
      keyboardPercent: 0,
      mousePercent: 0,
      idleSeconds,
      trackingState: "IDLE",
      capturedAt: new Date()
    }
  });

  return jsonWithCookies(response, { entry: updatedEntry, idleSeconds });
}
