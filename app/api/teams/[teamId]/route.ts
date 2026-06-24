import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRouteUser } from "@/lib/auth-route";
import { jsonWithCookies } from "@/lib/http";
import { z } from "zod";

const teamUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  leaderId: z.string().nullable().optional()
});

type Params = {
  params: Promise<{ teamId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const body = await request.json();
  const parsed = teamUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(response, { error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await prisma.teamMember.findFirst({
    where: {
      userId: context.profile.id,
      status: { not: "REMOVED" }
    }
  });

  if (!membership) {
    return jsonWithCookies(response, { error: "No organization found" }, { status: 404 });
  }

  // Verify the team belongs to the organization
  const existingTeam = await prisma.team.findFirst({
    where: {
      id: teamId,
      organizationId: membership.organizationId
    }
  });

  if (!existingTeam) {
    return jsonWithCookies(response, { error: "Team not found" }, { status: 404 });
  }

  const updatedTeam = await prisma.team.update({
    where: { id: teamId },
    data: parsed.data,
    include: {
      leader: true,
      members: {
        include: {
          user: true
        }
      }
    }
  });

  return jsonWithCookies(response, { team: updatedTeam });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const response = NextResponse.next();
  // Instead of requiring route user directly, we can use the existing getWorkspaceContext from workspace.ts
  // However, getWorkspaceContext uses cookies which works inside route handlers
  const { getWorkspaceContext } = await import("@/lib/workspace");
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  if (context.workspaceRole !== "admin") {
    return jsonWithCookies(response, { error: "Forbidden: Only admins can delete teams" }, { status: 403 });
  }

  const { teamId } = await params;

  // Verify the team belongs to the organization
  const existingTeam = await prisma.team.findFirst({
    where: {
      id: teamId,
      organizationId: context.organization.id
    }
  });

  if (!existingTeam) {
    return jsonWithCookies(response, { error: "Team not found" }, { status: 404 });
  }

  await prisma.team.delete({
    where: { id: teamId }
  });

  return jsonWithCookies(response, { success: true });
}
