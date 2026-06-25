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
    },
    include: {
      project: {
        include: {
          team: true
        }
      }
    }
  });

  if (!task) {
    return jsonWithCookies(response, { error: "Task not found or not assigned to you" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  
  const allowedStatuses = ["TODO", "IN_PROGRESS", "REVIEW"];
  let status = body.status;
  if (!allowedStatuses.includes(status)) {
    status = "TODO";
  }

  const updateData: any = { status };
  
  if (status === "REVIEW") {
    if (body.workDetails !== undefined) updateData.workDetails = body.workDetails;
    if (body.githubLink !== undefined) updateData.githubLink = body.githubLink;
    updateData.rejectionReason = null; // Clear rejection reason when resubmitted
  }

  const updatedTask = await prisma.task.update({
    where: { id: task.id },
    data: updateData
  });

  if (status === "REVIEW" && task.status !== "REVIEW") {
    const leaderId = task.project?.team?.leaderId;
    await prisma.notification.create({
      data: {
        organizationId: context.organization.id,
        createdById: context.profile.id,
        recipientUserId: leaderId || undefined,
        title: "Task ready for review",
        message: `The task "${task.title}" has been moved to Testing/Review by ${context.profile.fullName || 'a team member'}.`,
        kind: "ANNOUNCEMENT",
        audience: "TEAM"
      }
    });
  }

  return jsonWithCookies(response, { task: updatedTask }, { status: 200 });
}
