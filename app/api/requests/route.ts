import { endOfDay, format, parse, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { jsonWithCookies } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { leaveRequestSchema, timeCorrectionRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  try {
    const context = await getWorkspaceContext();

    if (!context) {
      return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
    }

    if (context.workspaceRole === "admin") {
      return jsonWithCookies(response, { error: "Administrators do not submit time correction requests." }, { status: 403 });
    }

    const body = await request.json();
    const correctionParsed = timeCorrectionRequestSchema.safeParse(body);
    const leaveParsed = leaveRequestSchema.safeParse(body);

    if (!correctionParsed.success && !leaveParsed.success) {
      const correctionValidationMessage = correctionParsed.success
        ? ""
        : Object.values(correctionParsed.error.flatten().fieldErrors).flat().filter(Boolean).join(" ");
      const leaveValidationMessage = leaveParsed.success
        ? ""
        : Object.values(leaveParsed.error.flatten().fieldErrors).flat().filter(Boolean).join(" ");
      const validationMessage = [correctionValidationMessage, leaveValidationMessage].filter(Boolean).join(" ");

      return jsonWithCookies(
        response,
        { error: validationMessage || "Invalid payload", issues: correctionParsed.error?.flatten() ?? leaveParsed.error?.flatten() },
        { status: 400 }
      );
    }

    if (correctionParsed.success) {
      const requestStartAt = new Date(correctionParsed.data.requestStartAt);
      const requestEndAt = new Date(correctionParsed.data.requestEndAt);
      const project = await prisma.project.findFirst({
        where: {
          id: correctionParsed.data.projectId,
          organizationId: context.organization.id
        },
        select: {
          id: true,
          name: true
        }
      });

      if (!project) {
        return jsonWithCookies(response, { error: "Select a valid project for this request." }, { status: 400 });
      }

      const reason = correctionParsed.data.reason.trim();

      const notification = await createNotification({
        organizationId: context.organization.id,
        createdById: context.profile.id,
        title: "Time correction request",
        message: `Correction requested for ${project.name} on ${format(requestStartAt, "MMM d, h:mm a")} - ${format(
          requestEndAt,
          "h:mm a"
        )}. Reason: ${reason}`,
        kind: "REQUEST",
        audience: "ADMINS",
        requestProjectId: project.id,
        requestProjectName: project.name,
        requestStartAt,
        requestEndAt,
        requestReason: reason,
        requestStatus: "PENDING"
      });

      if (!notification) {
        return jsonWithCookies(
          response,
          {
            error: "Notifications table is not ready yet. Apply the latest Prisma migration first."
          },
          { status: 503 }
        );
      }

      return jsonWithCookies(response, { request: notification }, { status: 201 });
    }

    if (!leaveParsed.success) {
      return jsonWithCookies(response, { error: "Invalid leave request format" }, { status: 400 });
    }

    const requestStartAt = startOfDay(parse(leaveParsed.data.startDate, "yyyy-MM-dd", new Date()));
    const requestEndAt = endOfDay(parse(leaveParsed.data.endDate, "yyyy-MM-dd", new Date()));
    const reason = leaveParsed.data.reason.trim();
    const documentUrl = typeof leaveParsed.data.documentUrl === "string" ? leaveParsed.data.documentUrl.trim() : undefined;

    const notification = await createNotification({
      organizationId: context.organization.id,
      createdById: context.profile.id,
      title: "Leave request",
      message: `Leave requested for ${format(requestStartAt, "MMM d, yyyy")} to ${format(
        requestEndAt,
        "MMM d, yyyy"
      )}. Reason: ${reason}${documentUrl ? `\nDocuments: ${documentUrl}` : ""}`,
      kind: "REQUEST",
      audience: "ADMINS",
      recipientUserId: (leaveParsed.data.teamLeadId as string) || undefined,
      requestProjectId: (leaveParsed.data.projectId as string) || undefined,
      requestStartAt,
      requestEndAt,
      requestReason: reason,
      requestStatus: "PENDING"
    });

    if (!notification) {
      return jsonWithCookies(
        response,
        {
          error: "Notifications table is not ready yet. Apply the latest Prisma migration first."
        },
        { status: 503 }
      );
    }

    return jsonWithCookies(response, { request: notification }, { status: 201 });
  } catch (error) {
    return jsonWithCookies(
      response,
      {
        error: error instanceof Error ? error.message : "Unable to send request"
      },
      { status: 500 }
    );
  }
}
