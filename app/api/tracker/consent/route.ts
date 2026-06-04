import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonWithCookies } from "@/lib/http";
import { isTrackerRequest } from "@/lib/tracker-auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();

  if (!isTrackerRequest(request)) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId")?.trim() ?? "";
  const userId = request.nextUrl.searchParams.get("userId")?.trim() ?? "";

  if (!organizationId || !userId) {
    return jsonWithCookies(response, { error: "Missing organizationId or userId" }, { status: 400 });
  }

  const membership = await prisma.teamMember.findFirst({
    where: {
      organizationId,
      userId
    },
    select: {
      consentStatus: true,
      status: true
    }
  });

  if (!membership) {
    return jsonWithCookies(response, { error: "Tracker user not found in workspace" }, { status: 404 });
  }

  return jsonWithCookies(response, {
    consentStatus: membership.consentStatus,
    status: membership.status,
    canTrack: membership.consentStatus === "ACCEPTED" && membership.status === "ACTIVE"
  });
}
