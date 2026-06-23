import { prisma } from "@/lib/prisma";

export type NotificationRecord = {
  id: string;
  organizationId: string;
  createdById: string | null;
  createdByName: string | null;
  recipientUserId: string | null;
  title: string;
  message: string;
  kind: "ANNOUNCEMENT" | "REQUEST";
  audience: "ALL" | "ADMINS" | "EMPLOYEES" | "TEAM";
  requestProjectId: string | null;
  requestProjectName: string | null;
  requestStartAt: Date | null;
  requestEndAt: Date | null;
  requestReason: string | null;
  requestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function extractProjectNameFromRequestMessage(message: string | null | undefined) {
  if (!message) {
    return null;
  }
  const match = message.match(/^Correction requested for (.+?) on /);
  return match?.[1]?.trim() ?? null;
}

export async function fetchNotificationById(organizationId: string, notificationId: string): Promise<NotificationRecord | null> {
  const n = await prisma.notification.findFirst({
    where: {
      organizationId,
      id: notificationId
    },
    include: {
      createdBy: true,
      project: true,
      reviewedBy: true
    }
  });

  if (!n) return null;

  return {
    id: n.id,
    organizationId: n.organizationId,
    createdById: n.createdById,
    createdByName: n.createdBy?.fullName ?? null,
    recipientUserId: n.recipientUserId,
    title: n.title,
    message: n.message,
    kind: n.kind as "ANNOUNCEMENT" | "REQUEST",
    audience: n.audience as "ALL" | "ADMINS" | "EMPLOYEES" | "TEAM",
    requestProjectId: n.requestProjectId,
    requestProjectName: n.project?.name ?? extractProjectNameFromRequestMessage(n.message),
    requestStartAt: n.requestStartAt,
    requestEndAt: n.requestEndAt,
    requestReason: n.requestReason,
    requestStatus: n.requestStatus as "PENDING" | "APPROVED" | "REJECTED" | null,
    reviewedById: n.reviewedById,
    reviewedByName: n.reviewedBy?.fullName ?? null,
    reviewedAt: n.reviewedAt,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  };
}

export async function listNotifications(organizationId: string, take = 50, userId?: string): Promise<NotificationRecord[]> {
  const where: any = {
    organizationId,
  };

  if (userId) {
    where.OR = [
      { recipientUserId: null },
      { recipientUserId: userId },
      { createdById: userId }
    ];
  }

  const notifications = await prisma.notification.findMany({
    where,
    take,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      createdBy: true,
      project: true,
      reviewedBy: true
    }
  });

  return notifications.map((n) => ({
    id: n.id,
    organizationId: n.organizationId,
    createdById: n.createdById,
    createdByName: n.createdBy?.fullName ?? null,
    recipientUserId: n.recipientUserId,
    title: n.title,
    message: n.message,
    kind: n.kind as "ANNOUNCEMENT" | "REQUEST",
    audience: n.audience as "ALL" | "ADMINS" | "EMPLOYEES" | "TEAM",
    requestProjectId: n.requestProjectId,
    requestProjectName: n.project?.name ?? extractProjectNameFromRequestMessage(n.message),
    requestStartAt: n.requestStartAt,
    requestEndAt: n.requestEndAt,
    requestReason: n.requestReason,
    requestStatus: n.requestStatus as "PENDING" | "APPROVED" | "REJECTED" | null,
    reviewedById: n.reviewedById,
    reviewedByName: n.reviewedBy?.fullName ?? null,
    reviewedAt: n.reviewedAt,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  }));
}

export async function createNotification(input: {
  organizationId: string;
  createdById: string;
  recipientUserId?: string | null;
  title: string;
  message: string;
  kind: "ANNOUNCEMENT" | "REQUEST";
  audience: "ALL" | "ADMINS" | "EMPLOYEES" | "TEAM";
  requestProjectId?: string | null;
  requestProjectName?: string | null;
  requestStartAt?: Date | null;
  requestEndAt?: Date | null;
  requestReason?: string | null;
  requestStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  reviewedById?: string | null;
  reviewedAt?: Date | null;
}): Promise<NotificationRecord | null> {
  const n = await prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      createdById: input.createdById,
      recipientUserId: input.recipientUserId ?? null,
      title: input.title,
      message: input.message,
      kind: input.kind,
      audience: input.audience,
      requestProjectId: input.requestProjectId ?? null,
      requestStartAt: input.requestStartAt ?? null,
      requestEndAt: input.requestEndAt ?? null,
      requestReason: input.requestReason ?? "",
      requestStatus: input.requestStatus ?? (input.kind === "REQUEST" ? "PENDING" : null),
      reviewedById: input.reviewedById ?? null,
      reviewedAt: input.reviewedAt ?? null,
    },
    include: {
      createdBy: true,
      project: true,
      reviewedBy: true
    }
  });

  return {
    id: n.id,
    organizationId: n.organizationId,
    createdById: n.createdById,
    createdByName: n.createdBy?.fullName ?? null,
    recipientUserId: n.recipientUserId,
    title: n.title,
    message: n.message,
    kind: n.kind as "ANNOUNCEMENT" | "REQUEST",
    audience: n.audience as "ALL" | "ADMINS" | "EMPLOYEES" | "TEAM",
    requestProjectId: n.requestProjectId,
    requestProjectName: n.project?.name ?? extractProjectNameFromRequestMessage(n.message),
    requestStartAt: n.requestStartAt,
    requestEndAt: n.requestEndAt,
    requestReason: n.requestReason,
    requestStatus: n.requestStatus as "PENDING" | "APPROVED" | "REJECTED" | null,
    reviewedById: n.reviewedById,
    reviewedByName: n.reviewedBy?.fullName ?? null,
    reviewedAt: n.reviewedAt,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  };
}
