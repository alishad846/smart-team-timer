import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonWithCookies } from "@/lib/http";
import { assignmentSchema } from "@/lib/validators";
import { getWorkspaceContext } from "@/lib/workspace";

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

  if (!parsed.data.employeeId && !parsed.data.employeeEmail) {
    return jsonWithCookies(response, { error: "Select an employee to assign the task." }, { status: 400 });
  }

  const employee = await prisma.user.findFirst({
    where: {
      ...(parsed.data.employeeId
        ? {
            id: parsed.data.employeeId
          }
        : {
            email: parsed.data.employeeEmail
          }),
      memberships: {
        some: {
          organizationId: context.organization.id
        }
      }
    }
  });

  if (!employee) {
    return jsonWithCookies(response, { error: "Employee not found in this workspace" }, { status: 404 });
  }

  const task = await prisma.task.findFirst({
    where: {
      id: parsed.data.taskId,
      project: {
        organizationId: context.organization.id
      }
    },
    include: {
      project: true,
      assignee: true
    }
  });

  if (!task) {
    return jsonWithCookies(response, { error: "Task not found" }, { status: 404 });
  }

  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      assigneeId: employee.id
    },
    include: {
      project: true,
      assignee: true
    }
  });

  return jsonWithCookies(response, { task: updatedTask, employee }, { status: 200 });
}
