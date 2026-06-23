import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRouteUser } from "@/lib/auth-route";
import { jsonWithCookies } from "@/lib/http";
import { teamMemberSchema, teamMemberUpdateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId") ?? undefined;
  const members = await prisma.teamMember.findMany({
    where: {
      organizationId
    },
    include: {
      user: true,
      team: true
    },
    orderBy: { createdAt: "desc" }
  });

  return jsonWithCookies(response, { members });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = teamMemberSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(response, { error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { organizationId, userId, ...data } = parsed.data;

  const member = await prisma.teamMember.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    },
    update: data,
    create: parsed.data
  });

  return jsonWithCookies(response, { member }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = teamMemberUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(response, { error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.status === "REMOVED") {
    const memberToDelete = await prisma.teamMember.findUnique({
      where: { id: parsed.data.memberId },
      include: { user: true }
    });

    if (memberToDelete) {
      // 1. Delete from Supabase Auth
      try {
        const { createAdminSupabase } = await import("@/lib/supabase/admin");
        const supabase = createAdminSupabase();
        await supabase.auth.admin.deleteUser(memberToDelete.user.authUserId);
      } catch (err) {
        console.error("Failed to delete user from Supabase Auth:", err);
      }

      // 2. Delete user from local database (which cascade deletes memberships, time entries, logs, screenshots, summaries)
      await prisma.user.delete({
        where: { id: memberToDelete.userId }
      });
    }

    return jsonWithCookies(response, { member: null, removed: true });
  }

  const member = await prisma.teamMember.update({
    where: { id: parsed.data.memberId },
    data: {
      teamId: parsed.data.teamId,
      role: parsed.data.role,
      status: parsed.data.status,
      consentStatus: parsed.data.consentStatus,
      title: parsed.data.title
    }
  });

  return jsonWithCookies(response, { member });
}
