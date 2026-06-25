import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonWithCookies } from "@/lib/http";
import { getWorkspaceContext } from "@/lib/workspace";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const response = NextResponse.next();

  try {
    const context = await getWorkspaceContext();

    if (!context) {
      return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!task) {
      return jsonWithCookies(response, { error: "Task not found" }, { status: 404 });
    }

    if (task.project?.organizationId !== context.organization.id) {
      return jsonWithCookies(response, { error: "Forbidden" }, { status: 403 });
    }

    // Only Admins and Team Leads can delete tasks
    let isTeamLead = false;
    if (task.project?.teamId) {
      const team = await prisma.team.findFirst({
        where: { id: task.project.teamId, leaderId: context.profile.id }
      });
      if (team) isTeamLead = true;
    }

    if (context.workspaceRole !== "admin" && !isTeamLead) {
      return jsonWithCookies(
        response,
        { error: "Only administrators or team leads can delete tasks" },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id }
    });

    return jsonWithCookies(response, { success: true }, { status: 200 });
  } catch (error) {
    return jsonWithCookies(
      response,
      {
        error: error instanceof Error ? error.message : "Unable to delete task"
      },
      { status: 500 }
    );
  }
}
