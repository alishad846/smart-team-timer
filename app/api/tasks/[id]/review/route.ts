import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { jsonWithCookies } from "@/lib/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  // Allow only TESTER or ADMIN roles to approve/reject tasks
  if (context.membership.role !== "TESTER" && context.workspaceRole !== "admin") {
    return jsonWithCookies(response, { error: "Only testers can review tasks" }, { status: 403 });
  }

  const { id } = await params;

  // Find the task
  const task = await prisma.task.findUnique({
    where: {
      id,
      project: {
        organizationId: context.organization.id
      }
    },
    include: {
      project: {
        include: { team: true }
      },
      assignee: true
    }
  });

  if (!task) {
    return jsonWithCookies(response, { error: "Task not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action === "approve") {
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: { status: "DONE" }
    });

    const leaderId = task.project?.team?.leaderId;
    
    // Notify team lead / admin
    await prisma.notification.create({
      data: {
        organizationId: context.organization.id,
        createdById: context.profile.id,
        recipientUserId: leaderId || undefined,
        title: "Task Approved & Completed",
        message: `The task "${task.title}" (assigned to ${task.assignee?.fullName || 'a member'}) has been tested and approved by ${context.profile.fullName || 'a tester'}.`,
        kind: "ANNOUNCEMENT",
        audience: "TEAM"
      }
    });

    return jsonWithCookies(response, { task: updatedTask }, { status: 200 });
  } else if (action === "reject") {
    const rejectionReason = body.rejectionReason || "No reason provided.";

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: { 
        status: "IN_PROGRESS",
        rejectionReason: rejectionReason
      }
    });

    // Notify the assignee
    if (task.assigneeId) {
      await prisma.notification.create({
        data: {
          organizationId: context.organization.id,
          createdById: context.profile.id,
          recipientUserId: task.assigneeId,
          title: "Task Rejected in Testing",
          message: `The task "${task.title}" was tested and rejected by ${context.profile.fullName || 'a tester'}. Reason: ${rejectionReason}`,
          kind: "ANNOUNCEMENT",
          audience: "EMPLOYEES"
        }
      });
    }

    return jsonWithCookies(response, { task: updatedTask }, { status: 200 });
  }

  return jsonWithCookies(response, { error: "Invalid action" }, { status: 400 });
}
