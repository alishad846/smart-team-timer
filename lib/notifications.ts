import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
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

let notificationProjectColumnCache: Promise<boolean> | null = null;
let notificationRecipientColumnCache: Promise<boolean> | null = null;

async function hasNotificationsTable() {
  const rows = await prisma.$queryRaw<Array<{ exists: string | null }>>(Prisma.sql`
    select to_regclass('public.notifications')::text as exists
  `);

  return Boolean(rows[0]?.exists);
}

async function hasNotificationProjectColumn() {
  notificationProjectColumnCache ??= prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'notifications'
        and column_name = 'request_project_id'
    ) as exists
  `).then((rows) => Boolean(rows[0]?.exists));

  return notificationProjectColumnCache;
}

async function hasNotificationRecipientColumn() {
  notificationRecipientColumnCache ??= prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'notifications'
        and column_name = 'recipient_user_id'
    ) as exists
  `).then((rows) => Boolean(rows[0]?.exists));

  return notificationRecipientColumnCache;
}

function notificationSelectSql(hasProjectColumn: boolean, hasRecipientColumn: boolean) {
  return hasProjectColumn
    ? Prisma.sql`
        n.id,
        n.organization_id as "organizationId",
        n.created_by_id as "createdById",
        u.full_name as "createdByName",
        ${hasRecipientColumn ? Prisma.sql`n.recipient_user_id as "recipientUserId",` : Prisma.sql`null::text as "recipientUserId",`}
        n.title,
        n.message,
        n.kind,
        n.audience,
        n.request_project_id as "requestProjectId",
        p.name as "requestProjectName",
        n.request_start_at as "requestStartAt",
        n.request_end_at as "requestEndAt",
        n.request_reason as "requestReason",
        n.request_status as "requestStatus",
        n.reviewed_by_id as "reviewedById",
        ru.full_name as "reviewedByName",
        n.reviewed_at as "reviewedAt",
        n.created_at as "createdAt",
        n.updated_at as "updatedAt"
      `
    : Prisma.sql`
        n.id,
        n.organization_id as "organizationId",
        n.created_by_id as "createdById",
        u.full_name as "createdByName",
        ${hasRecipientColumn ? Prisma.sql`n.recipient_user_id as "recipientUserId",` : Prisma.sql`null::text as "recipientUserId",`}
        n.title,
        n.message,
        n.kind,
        n.audience,
        null::text as "requestProjectId",
        null::text as "requestProjectName",
        n.request_start_at as "requestStartAt",
        n.request_end_at as "requestEndAt",
        n.request_reason as "requestReason",
        n.request_status as "requestStatus",
        n.reviewed_by_id as "reviewedById",
        ru.full_name as "reviewedByName",
        n.reviewed_at as "reviewedAt",
        n.created_at as "createdAt",
        n.updated_at as "updatedAt"
      `;
}

export async function fetchNotificationById(organizationId: string, notificationId: string) {
  const hasProjectColumn = await hasNotificationProjectColumn();
  const hasRecipientColumn = await hasNotificationRecipientColumn();

  const rows = hasProjectColumn
    ? await prisma.$queryRaw<NotificationRecord[]>(Prisma.sql`
        select
          ${notificationSelectSql(true, hasRecipientColumn)}
        from notifications n
        left join users u on u.id = n.created_by_id
        left join projects p on p.id = n.request_project_id
        left join users ru on ru.id = n.reviewed_by_id
        where n.organization_id = ${organizationId}
          and n.id = ${notificationId}
        limit 1
      `)
    : await prisma.$queryRaw<NotificationRecord[]>(Prisma.sql`
        select
          ${notificationSelectSql(false, hasRecipientColumn)}
        from notifications n
        left join users u on u.id = n.created_by_id
        left join users ru on ru.id = n.reviewed_by_id
        where n.organization_id = ${organizationId}
          and n.id = ${notificationId}
        limit 1
      `);

  return rows[0] ?? null;
}

export function extractProjectNameFromRequestMessage(message: string | null | undefined) {
  if (!message) {
    return null;
  }

  const match = message.match(/^Correction requested for (.+?) on /);
  return match?.[1]?.trim() ?? null;
}

export async function listNotifications(organizationId: string, take = 50, userId?: string) {
  if (!(await hasNotificationsTable())) {
    return [];
  }

  const hasProjectColumn = await hasNotificationProjectColumn();
  const hasRecipientColumn = await hasNotificationRecipientColumn();
  const whereClause = (targetUserId?: string) =>
    hasRecipientColumn && userId
      ? Prisma.sql`
          where n.organization_id = ${organizationId}
            and (n.recipient_user_id is null or n.recipient_user_id = ${targetUserId} or n.created_by_id = ${targetUserId})
        `
      : Prisma.sql`
          where n.organization_id = ${organizationId}
        `;

  const notifications = hasProjectColumn
    ? await prisma.$queryRaw<NotificationRecord[]>(Prisma.sql`
        select
          ${notificationSelectSql(true, hasRecipientColumn)}
        from notifications n
        left join users u on u.id = n.created_by_id
        left join projects p on p.id = n.request_project_id
        left join users ru on ru.id = n.reviewed_by_id
        ${whereClause(userId)}
        order by n.created_at desc
        limit ${take}
      `)
    : await prisma.$queryRaw<NotificationRecord[]>(Prisma.sql`
        select
          ${notificationSelectSql(false, hasRecipientColumn)}
        from notifications n
        left join users u on u.id = n.created_by_id
        left join users ru on ru.id = n.reviewed_by_id
        ${whereClause(userId)}
        order by n.created_at desc
        limit ${take}
      `);

  return notifications.map((notification) => ({
    ...notification,
    requestProjectName:
      notification.requestProjectName ?? extractProjectNameFromRequestMessage(notification.message)
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
}) {
  if (!(await hasNotificationsTable())) {
    return null;
  }

  const hasProjectColumn = await hasNotificationProjectColumn();
  const hasRecipientColumn = await hasNotificationRecipientColumn();

  const notificationId = randomUUID();

  if (hasProjectColumn) {
    if (hasRecipientColumn) {
      await prisma.$executeRaw(Prisma.sql`
      insert into notifications (
        id,
        organization_id,
        created_by_id,
        recipient_user_id,
        title,
        message,
        kind,
        audience,
        request_project_id,
        request_start_at,
        request_end_at,
        request_reason,
        request_status,
        reviewed_by_id,
        reviewed_at,
        created_at,
        updated_at
      ) values (
        ${notificationId},
        ${input.organizationId},
        ${input.createdById},
        ${input.recipientUserId ?? null},
        ${input.title},
        ${input.message},
        ${input.kind}::"NotificationKind",
        ${input.audience}::"NotificationAudience",
        ${input.requestProjectId ?? null},
        ${input.requestStartAt ?? null},
        ${input.requestEndAt ?? null},
        ${input.requestReason ?? null},
        ${(input.requestStatus ?? (input.kind === "REQUEST" ? "PENDING" : null))}::"RequestStatus",
        ${input.reviewedById ?? null},
        ${input.reviewedAt ?? null},
        now(),
        now()
      )
    `);
    } else {
      await prisma.$executeRaw(Prisma.sql`
      insert into notifications (
        id,
        organization_id,
        created_by_id,
        title,
        message,
        kind,
        audience,
        request_project_id,
        request_start_at,
        request_end_at,
        request_reason,
        request_status,
        reviewed_by_id,
        reviewed_at,
        created_at,
        updated_at
      ) values (
        ${notificationId},
        ${input.organizationId},
        ${input.createdById},
        ${input.title},
        ${input.message},
        ${input.kind}::"NotificationKind",
        ${input.audience}::"NotificationAudience",
        ${input.requestProjectId ?? null},
        ${input.requestStartAt ?? null},
        ${input.requestEndAt ?? null},
        ${input.requestReason ?? null},
        ${(input.requestStatus ?? (input.kind === "REQUEST" ? "PENDING" : null))}::"RequestStatus",
        ${input.reviewedById ?? null},
        ${input.reviewedAt ?? null},
        now(),
        now()
      )
    `);
    }
  } else {
    if (hasRecipientColumn) {
      await prisma.$executeRaw(Prisma.sql`
      insert into notifications (
        id,
        organization_id,
        created_by_id,
        recipient_user_id,
        title,
        message,
        kind,
        audience,
        request_start_at,
        request_end_at,
        request_reason,
        request_status,
        reviewed_by_id,
        reviewed_at,
        created_at,
        updated_at
      ) values (
        ${notificationId},
        ${input.organizationId},
        ${input.createdById},
        ${input.recipientUserId ?? null},
        ${input.title},
        ${input.message},
        ${input.kind}::"NotificationKind",
        ${input.audience}::"NotificationAudience",
        ${input.requestStartAt ?? null},
        ${input.requestEndAt ?? null},
        ${input.requestReason ?? null},
        ${(input.requestStatus ?? (input.kind === "REQUEST" ? "PENDING" : null))}::"RequestStatus",
        ${input.reviewedById ?? null},
        ${input.reviewedAt ?? null},
        now(),
        now()
      )
    `);
    } else {
      await prisma.$executeRaw(Prisma.sql`
      insert into notifications (
        id,
        organization_id,
        created_by_id,
        title,
        message,
        kind,
        audience,
        request_start_at,
        request_end_at,
        request_reason,
        request_status,
        reviewed_by_id,
        reviewed_at,
        created_at,
        updated_at
      ) values (
        ${notificationId},
        ${input.organizationId},
        ${input.createdById},
        ${input.title},
        ${input.message},
        ${input.kind}::"NotificationKind",
        ${input.audience}::"NotificationAudience",
        ${input.requestStartAt ?? null},
        ${input.requestEndAt ?? null},
        ${input.requestReason ?? null},
        ${(input.requestStatus ?? (input.kind === "REQUEST" ? "PENDING" : null))}::"RequestStatus",
        ${input.reviewedById ?? null},
        ${input.reviewedAt ?? null},
        now(),
        now()
      )
    `);
    }
  }

  const notification = await fetchNotificationById(input.organizationId, notificationId);

  if (!notification) {
    return null;
  }

  return {
    id: notification.id,
    organizationId: notification.organizationId,
    createdById: notification.createdById,
    createdByName: notification.createdByName,
    recipientUserId: notification.recipientUserId,
    title: notification.title,
    message: notification.message,
    kind: notification.kind,
    audience: notification.audience,
    requestProjectId: hasProjectColumn ? notification.requestProjectId : null,
    requestProjectName: (
      hasProjectColumn
        ? (notification as { project?: { name: string } | null }).project?.name ?? null
        : input.requestProjectName ?? null
    ) ?? extractProjectNameFromRequestMessage(notification.message),
    requestStartAt: notification.requestStartAt,
    requestEndAt: notification.requestEndAt,
    requestReason: notification.requestReason,
    requestStatus: notification.requestStatus,
    reviewedById: notification.reviewedById,
    reviewedByName: notification.reviewedByName,
    reviewedAt: notification.reviewedAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt
  };
}
