import { NextRequest, NextResponse } from "next/server";
import { format, isSameDay } from "date-fns";
import { Prisma } from "@prisma/client";
import {
  extractProjectNameFromRequestMessage,
  fetchNotificationById,
  createNotification
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { jsonWithCookies } from "@/lib/http";
import { getWorkspaceContext } from "@/lib/workspace";

type Params = {
  params: Promise<{ notificationId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const response = NextResponse.next();

  try {
    const context = await getWorkspaceContext();

    if (!context) {
      return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
    }

    if (context.workspaceRole !== "admin") {
      return jsonWithCookies(response, { error: "Forbidden" }, { status: 403 });
    }

    const { notificationId } = await params;
    const body = await request.json().catch(() => ({} as { action?: string }));
    const action = typeof body.action === "string" ? body.action.toUpperCase() : "";

    if (action !== "APPROVE" && action !== "REJECT") {
      return jsonWithCookies(response, { error: "Invalid action" }, { status: 400 });
    }

    const notification = await fetchNotificationById(context.organization.id, notificationId);

    if (!notification) {
      return jsonWithCookies(response, { error: "Request not found" }, { status: 404 });
    }

    const isLeaveRequest = notification.title.toLowerCase().includes("leave");

    if (notification.kind !== "REQUEST") {
      return jsonWithCookies(response, { error: "Only request notifications can be reviewed" }, { status: 400 });
    }

    if (notification.requestStatus && notification.requestStatus !== "PENDING") {
      return jsonWithCookies(response, { request: notification }, { status: 200 });
    }

    if (action === "REJECT") {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          requestStatus: "REJECTED",
          reviewedById: context.profile.id,
          reviewedAt: new Date()
        }
      });

      if (notification.createdById) {
        if (isLeaveRequest && notification.requestStartAt && notification.requestEndAt) {
          const leaveRange = isSameDay(notification.requestStartAt, notification.requestEndAt)
            ? format(notification.requestStartAt, "MMM d, yyyy")
            : `${format(notification.requestStartAt, "MMM d, yyyy")} to ${format(notification.requestEndAt, "MMM d, yyyy")}`;

          await createNotification({
            organizationId: context.organization.id,
            createdById: context.profile.id,
            recipientUserId: notification.createdById,
            title: "Leave rejected",
            message: `Your leave request for ${leaveRange} was rejected.`,
            kind: "ANNOUNCEMENT",
            audience: "EMPLOYEES"
          });
        } else {
          await createNotification({
            organizationId: context.organization.id,
            createdById: context.profile.id,
            recipientUserId: notification.createdById,
            title: "Time correction rejected",
            message: `Your time correction request for "${notification.requestProjectName ?? "Project"}" was rejected.`,
            kind: "ANNOUNCEMENT",
            audience: "EMPLOYEES"
          });
        }
      }

      const updated = await fetchNotificationById(context.organization.id, notification.id);

      return jsonWithCookies(response, { request: updated }, { status: 200 });
    }

    if (!notification.createdById || !notification.requestStartAt || !notification.requestEndAt) {
      return jsonWithCookies(
        response,
        { error: "This request is missing the date range needed to auto-add time." },
        { status: 400 }
      );
    }

    const requestStartAt = new Date(notification.requestStartAt);
    const requestEndAt = new Date(notification.requestEndAt);
    const totalSeconds = Math.max(0, Math.round((requestEndAt.getTime() - requestStartAt.getTime()) / 1000));

    const requesterMember = await prisma.teamMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: context.organization.id,
          userId: notification.createdById
        }
      },
      select: {
        teamId: true
      }
    });

    if (isLeaveRequest) {
      // Leave request approval: just update the request status, do not create a time entry (stays real).
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          requestStatus: "APPROVED",
          reviewedById: context.profile.id,
          reviewedAt: new Date()
        }
      });

      if (notification.createdById) {
        const leaveRange = isSameDay(notification.requestStartAt, notification.requestEndAt)
          ? format(notification.requestStartAt, "MMM d, yyyy")
          : `${format(notification.requestStartAt, "MMM d, yyyy")} to ${format(notification.requestEndAt, "MMM d, yyyy")}`;

        await createNotification({
          organizationId: context.organization.id,
          createdById: context.profile.id,
          recipientUserId: notification.createdById,
          title: "Leave approved",
          message: `Your leave request for ${leaveRange} was approved.`,
          kind: "ANNOUNCEMENT",
          audience: "EMPLOYEES"
        });
      }
    } else {
      // Project time request approval: creates a STOPPED time entry with productive seconds.
      const requestProjectName = extractProjectNameFromRequestMessage(notification.message);
      const requestProject = notification.requestProjectId
        ? await prisma.project.findFirst({
            where: {
              id: notification.requestProjectId,
              organizationId: context.organization.id
            },
            select: {
              id: true
            }
          })
        : requestProjectName
          ? await prisma.project.findFirst({
              where: {
                name: requestProjectName,
                organizationId: context.organization.id
              },
              select: {
                id: true
              }
            })
          : null;

      await prisma.$transaction(async (tx) => {
        await tx.notification.update({
          where: { id: notification.id },
          data: {
            requestStatus: "APPROVED",
            reviewedById: context.profile.id,
            reviewedAt: new Date()
          }
        });

        await tx.timeEntry.create({
          data: {
            userId: notification.createdById!,
            organizationId: context.organization.id,
            teamId: requesterMember?.teamId ?? null,
            projectId: requestProject?.id ?? notification.requestProjectId ?? null,
            taskId: null,
            status: "STOPPED",
            startedAt: requestStartAt,
            endedAt: requestEndAt,
            totalSeconds,
            productiveSeconds: totalSeconds,
            idleSeconds: 0,
            note: notification.requestReason ?? notification.message
          }
        });
      });

      if (notification.createdById) {
        await createNotification({
          organizationId: context.organization.id,
          createdById: context.profile.id,
          recipientUserId: notification.createdById,
          title: "Time correction approved",
          message: `Your time correction request for "${notification.requestProjectName ?? "Project"}" was approved.`,
          kind: "ANNOUNCEMENT",
          audience: "EMPLOYEES"
        });
      }
    }

    const updatedRequest = await fetchNotificationById(context.organization.id, notification.id);

    return jsonWithCookies(
      response,
      {
        request: updatedRequest
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonWithCookies(
      response,
      {
        error: error instanceof Error ? error.message : "Unable to review request"
      },
      { status: 500 }
    );
  }
}
