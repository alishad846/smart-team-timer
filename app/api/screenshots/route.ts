import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { screenshotSchema } from "@/lib/validators";
import { jsonWithCookies } from "@/lib/http";
import { getWorkspaceContext } from "@/lib/workspace";
import { isTrackerRequest } from "@/lib/tracker-auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId") ?? context.organization.id;
  const userId = request.nextUrl.searchParams.get("userId") ?? context.profile.id;

  const screenshots = await prisma.screenshot.findMany({
    where: {
      organizationId,
      userId
    },
    orderBy: { capturedAt: "desc" },
    take: 50
  });

  return jsonWithCookies(response, { screenshots });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const body = await request.json();
  const parsed = screenshotSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(response, { error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const trackerRequest = isTrackerRequest(request);
  const context = trackerRequest ? null : await getWorkspaceContext();

  if (!context && !trackerRequest) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = parsed.data.organizationId;
  const userId = parsed.data.userId;
  const teamId = parsed.data.teamId;

  if (trackerRequest) {
    const membership = await prisma.teamMember.findFirst({
      where: {
        organizationId,
        userId
      }
    });

    if (!membership) {
      return jsonWithCookies(response, { error: "Tracker user not found in workspace" }, { status: 404 });
    }

    if (membership.consentStatus !== "ACCEPTED") {
      return jsonWithCookies(
        response,
        { error: "Tracking permission is required before screenshots can be stored." },
        { status: 403 }
      );
    }
  } else if (
    context &&
    (context.profile.id !== userId || context.organization.id !== organizationId)
  ) {
    return jsonWithCookies(response, { error: "Forbidden" }, { status: 403 });
  }

  if (context && context.membership.consentStatus !== "ACCEPTED") {
    return jsonWithCookies(
      response,
      { error: "Tracking permission is required before screenshots can be stored." },
      { status: 403 }
    );
  }

  const screenshot = await prisma.screenshot.create({
    data: {
      userId,
      organizationId,
      teamId: teamId ?? (context?.membership.teamId ?? null),
      imageUrl: parsed.data.imageUrl,
      activeApp: parsed.data.activeApp,
      activeWindow: parsed.data.activeWindow,
      capturedAt: parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date()
    }
  });

  return jsonWithCookies(response, { screenshot }, { status: 201 });
}
