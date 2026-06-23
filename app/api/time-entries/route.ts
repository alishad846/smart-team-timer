import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timeEntrySchema } from "@/lib/validators";
import { jsonWithCookies } from "@/lib/http";
import { getWorkspaceContext } from "@/lib/workspace";

function computeDuration(startedAt: string, endedAt?: string) {
  if (!endedAt) return 0;
  return Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
}

function splitResidualSeconds(
  entry: {
    totalSeconds: number;
    productiveSeconds: number;
    idleSeconds: number;
  },
  residualSeconds: number
) {
  if (residualSeconds <= 0) {
    return {
      productiveSeconds: 0,
      idleSeconds: 0
    };
  }

  const trackedSeconds = Math.max(entry.totalSeconds, 0);
  const productiveRatio = trackedSeconds > 0 ? Math.min(1, Math.max(0, entry.productiveSeconds / trackedSeconds)) : 1;
  const productiveSeconds = Math.min(residualSeconds, Math.max(0, Math.round(residualSeconds * productiveRatio)));

  return {
    productiveSeconds,
    idleSeconds: residualSeconds - productiveSeconds
  };
}

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId") ?? context.organization.id;
  const userId = request.nextUrl.searchParams.get("userId") ?? context.profile.id;

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      organizationId
    },
    orderBy: { startedAt: "desc" }
  });

  return jsonWithCookies(response, { entries });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = timeEntrySchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(response, { error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  if ((payload.action === "START" || payload.action === "RESUME") && context.membership.consentStatus !== "ACCEPTED") {
    return jsonWithCookies(
      response,
      { error: "Tracking permission is required before you can start or resume time. Please approve monitoring first." },
      { status: 403 }
    );
  }

  if (payload.action === "START" && payload.taskId) {
    const assignedTask = await prisma.task.findFirst({
      where: {
        id: payload.taskId,
        assigneeId: context.profile.id,
        project: {
          organizationId: payload.organizationId
        }
      },
      select: {
        id: true
      }
    });

    if (!assignedTask) {
      return jsonWithCookies(response, { error: "This task is not assigned to you." }, { status: 403 });
    }
  }

  if (payload.action === "START") {
    const startedAt = payload.startedAt ? new Date(payload.startedAt) : new Date();
    const entry = await prisma.timeEntry.create({
      data: {
        userId: payload.userId,
        organizationId: payload.organizationId,
        teamId: payload.teamId,
        projectId: payload.projectId,
        taskId: payload.taskId,
        startedAt,
        status: "RUNNING",
        note: payload.note ?? ""
      }
    });
    return jsonWithCookies(response, { entry }, { status: 201 });
  }

  const currentEntry = await prisma.timeEntry.findFirst({
    where: {
      userId: payload.userId,
      organizationId: payload.organizationId,
      status: {
        in: ["RUNNING", "PAUSED"]
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!currentEntry) {
    return jsonWithCookies(response, { error: "No active time entry found" }, { status: 404 });
  }

  if (payload.action === "RESUME") {
    if (currentEntry.status === "RUNNING") {
      return jsonWithCookies(response, { entry: currentEntry });
    }

    const entry = await prisma.timeEntry.update({
      where: { id: currentEntry.id },
      data: {
        status: "RUNNING",
        startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
        pauseStartedAt: null
      }
    });
    return jsonWithCookies(response, { entry });
  }

  const endedAt = payload.endedAt ? new Date(payload.endedAt) : new Date();

  if (payload.action === "PAUSE") {
    if (currentEntry.status === "PAUSED") {
      return jsonWithCookies(response, { entry: currentEntry });
    }

    let residualSeconds = computeDuration(currentEntry.updatedAt.toISOString(), endedAt.toISOString());
    let status: "PAUSED" | "STOPPED" = "PAUSED";
    let finalPauseStartedAt: Date | null = endedAt;
    let finalEndedAt = endedAt;

    if (currentEntry.totalSeconds + residualSeconds >= 7200) {
      residualSeconds = Math.max(0, 7200 - currentEntry.totalSeconds);
      status = "STOPPED";
      finalPauseStartedAt = null;
      finalEndedAt = new Date(currentEntry.updatedAt.getTime() + residualSeconds * 1000);
    }

    const residual = splitResidualSeconds(currentEntry, residualSeconds);
    const totalSeconds = currentEntry.totalSeconds + residualSeconds;
    const productiveSeconds = currentEntry.productiveSeconds + residual.productiveSeconds;
    const entry = await prisma.timeEntry.update({
      where: { id: currentEntry.id },
      data: {
        status,
        endedAt: finalEndedAt,
        pauseStartedAt: finalPauseStartedAt,
        totalSeconds,
        productiveSeconds,
        idleSeconds: currentEntry.idleSeconds + residual.idleSeconds
      }
    });

    return jsonWithCookies(response, { entry });
  }

  if (currentEntry.status === "PAUSED") {
    const entry = await prisma.timeEntry.update({
      where: { id: currentEntry.id },
      data: {
        status: "STOPPED",
        endedAt,
        pauseStartedAt: null
      }
    });

    return jsonWithCookies(response, { entry });
  }

  let elapsedSeconds = computeDuration(currentEntry.updatedAt.toISOString(), endedAt.toISOString());
  let finalEndedAt = endedAt;

  if (currentEntry.totalSeconds + elapsedSeconds >= 7200) {
    elapsedSeconds = Math.max(0, 7200 - currentEntry.totalSeconds);
    finalEndedAt = new Date(currentEntry.updatedAt.getTime() + elapsedSeconds * 1000);
  }

  const elapsed = splitResidualSeconds(currentEntry, elapsedSeconds);
  const totalSeconds = currentEntry.totalSeconds + elapsedSeconds;
  const productiveSeconds = currentEntry.productiveSeconds + elapsed.productiveSeconds;
  const idleSeconds = currentEntry.idleSeconds + elapsed.idleSeconds;

  const entry = await prisma.timeEntry.update({
    where: { id: currentEntry.id },
    data: {
      status: "STOPPED",
      endedAt: finalEndedAt,
      pauseStartedAt: null,
      totalSeconds,
      productiveSeconds,
      idleSeconds
    }
  });

  return jsonWithCookies(response, { entry });
}
