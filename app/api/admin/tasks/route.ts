import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { jsonWithCookies } from "@/lib/http";

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

  const [teams, projects, tasks, totalTasks, members] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: context.organization.id },
      include: { team: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: {
        project: {
          organizationId: context.organization.id,
        },
      },
      include: {
        project: true,
        assignee: true,
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: size,
    }),
    prisma.task.count({
      where: {
        project: {
          organizationId: context.organization.id,
        },
      },
    }),
    prisma.teamMember.findMany({
      where: { organizationId: context.organization.id, status: { not: "REMOVED" } },
      include: { user: true, team: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return jsonWithCookies(new NextResponse(), {
    teams,
    projects,
    tasks,
    totalTasks,
    members,
    page,
    size,
    totalPages: Math.ceil(totalTasks / size),
  });
}