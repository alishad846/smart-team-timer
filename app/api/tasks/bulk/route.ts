import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { jsonWithCookies } from "@/lib/http";
import { z } from "zod";

const bulkTaskSchema = z.object({
  projectId: z.string().min(1),
  tasks: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional().default(""),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
    })
  ).min(1)
});

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context || context.workspaceRole !== "admin") {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bulkTaskSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(
      response,
      { error: "Invalid payload format for bulk tasks" },
      { status: 400 }
    );
  }

  const { projectId, tasks } = parsed.data;

  // Ensure project exists and belongs to organization
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: context.organization.id }
  });

  if (!project) {
    return jsonWithCookies(response, { error: "Project not found" }, { status: 404 });
  }

  const tasksToCreate = tasks.map((task) => ({
    projectId,
    title: task.title.trim(),
    description: task.description.trim(),
    priority: task.priority,
    status: "TODO" as const,
    assigneeId: null
  }));

  const result = await prisma.task.createMany({
    data: tasksToCreate
  });

  return jsonWithCookies(response, { createdCount: result.count }, { status: 201 });
}
