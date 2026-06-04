import { NextRequest, NextResponse } from "next/server";
import { jsonWithCookies } from "@/lib/http";
import { notificationSchema } from "@/lib/validators";
import { getWorkspaceContext } from "@/lib/workspace";
import { createNotification, listNotifications } from "@/lib/notifications";

export async function GET() {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await listNotifications(context.organization.id, 50);

  return jsonWithCookies(response, { notifications });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  try {
    const context = await getWorkspaceContext();

    if (!context) {
      return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = notificationSchema.safeParse(body);

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

    const notification = await createNotification({
      organizationId: context.organization.id,
      createdById: context.profile.id,
      title: parsed.data.title,
      message: parsed.data.message,
      kind: parsed.data.kind,
      audience: parsed.data.audience
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

    return jsonWithCookies(response, { notification }, { status: 201 });
  } catch (error) {
    return jsonWithCookies(
      response,
      {
        error: error instanceof Error ? error.message : "Unable to send notification"
      },
      { status: 500 }
    );
  }
}
