import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonWithCookies } from "@/lib/http";
import { getWorkspaceContext } from "@/lib/workspace";
import { z } from "zod";

const assignmentSchema = z.object({
  taskId: z.string().min(1),
  employeeIds: z.array(z.string().min(1)).min(1)
});

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  if (context.workspaceRole !== "admin") {
    return jsonWithCookies(response, { error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = assignmentSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(
      response,
      { error: "Select a task and at least one employee." },
      { status: 400 }
    );
  }

  const { taskId, employeeIds } = parsed.data;

  // Find the source task (must belong to this org)
  const sourceTask = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        organizationId: context.organization.id
      }
    }
  });

  if (!sourceTask) {
    return jsonWithCookies(response, { error: "Task not found" }, { status: 404 });
  }

  // Validate all employee IDs belong to this org
  const members = await prisma.teamMember.findMany({
    where: {
      organizationId: context.organization.id,
      userId: { in: employeeIds }
    }
  });

  const validUserIds = new Set(members.map((m) => m.userId));
  const filteredIds = employeeIds.filter((id) => validUserIds.has(id));

  if (filteredIds.length === 0) {
    return jsonWithCookies(response, { error: "No valid employees found in this workspace." }, { status: 400 });
  }

  // Create a copy of the task for each selected employee
  const tasksToCreate = filteredIds.map((userId) => ({
    projectId: sourceTask.projectId,
    title: sourceTask.title,
    description: sourceTask.description,
    priority: sourceTask.priority,
    status: "TODO" as const,
    assigneeId: userId
  }));

  const result = await prisma.task.createMany({
    data: tasksToCreate
  });

  return jsonWithCookies(response, { assignedCount: result.count }, { status: 200 });
}
