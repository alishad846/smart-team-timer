import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { jsonWithCookies } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { timeCorrectionRequestSchema } from "@/lib/validators";

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
    const parsed = timeCorrectionRequestSchema.safeParse(body);

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

    const requestStartAt = new Date(parsed.data.requestStartAt);
    const requestEndAt = new Date(parsed.data.requestEndAt);
    const project = await prisma.project.findFirst({
      where: {
        id: parsed.data.projectId,
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

    const reason = parsed.data.reason.trim();

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
