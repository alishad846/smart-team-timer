import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRouteUser } from "@/lib/auth-route";
import { taskSchema } from "@/lib/validators";
import { jsonWithCookies } from "@/lib/http";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId: request.nextUrl.searchParams.get("projectId") ?? undefined
    },
    orderBy: { createdAt: "desc" }
  });

  return jsonWithCookies(response, { tasks });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = taskSchema.safeParse(body);

  if (!parsed.success) {
    const validationMessage = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter(Boolean)
      .join(" ");

    return jsonWithCookies(
      response,
      { error: validationMessage || "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Get organization membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId: context.profile.id,
      status: { not: "REMOVED" }
    }
  });

  if (!membership) {
    return jsonWithCookies(response, { error: "No organization membership found" }, { status: 404 });
  }

  const organizationId = membership.organizationId;

  // Find project
  const project = await prisma.project.findFirst({
    where: {
      id: parsed.data.projectId,
      organizationId
    }
  });

  if (!project) {
    return jsonWithCookies(response, { error: "Project not found in this organization" }, { status: 404 });
  }

  // Check if non-admin is team lead of project's team
  const isAdmin = context.profile.role === "OWNER" || context.profile.role === "MANAGER";
  if (!isAdmin) {
    if (!project.teamId) {
      return jsonWithCookies(
        response,
        { error: "You are not authorized to create tasks for this project (unassigned project)" },
        { status: 403 }
      );
    }

    const team = await prisma.team.findFirst({
      where: {
        id: project.teamId,
        leaderId: context.profile.id
      }
    });

    if (!team) {
      return jsonWithCookies(
        response,
        { error: "You are not authorized to create tasks for this project (must be Team Lead)" },
        { status: 403 }
      );
    }

    // Check if assignee is in the team
    if (parsed.data.assigneeId) {
      const assigneeMember = await prisma.teamMember.findFirst({
        where: {
          userId: parsed.data.assigneeId,
          teamId: team.id,
          status: { not: "REMOVED" }
        }
      });

      if (!assigneeMember) {
        return jsonWithCookies(response, { error: "Assignee must be a member of your team" }, { status: 400 });
      }
    }
  }

  const task = await prisma.task.create({
    data: parsed.data
  });

  return jsonWithCookies(response, { task }, { status: 201 });
}
