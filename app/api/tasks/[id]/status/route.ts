import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { jsonWithCookies } from "@/lib/http";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the task – it must be assigned to this user
  const task = await prisma.task.findFirst({
    where: {
      id,
      assigneeId: context.profile.id,
      project: {
        organizationId: context.organization.id
      }
    }
  });

  if (!task) {
    return jsonWithCookies(response, { error: "Task not found or not assigned to you" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status === "DONE" ? "DONE" : "TODO";

  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: { status }
  });

  return jsonWithCookies(response, { task: updatedTask }, { status: 200 });
}
