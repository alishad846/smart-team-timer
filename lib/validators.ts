import { z } from "zod";

const trimmedString = (min: number) =>
  z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(min));

const normalizedEmail = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.string().email()
);

const normalizedRole = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum(["OWNER", "MANAGER", "EMPLOYEE", "INTERN"])
);

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional()
);

const normalizedGithubUsername = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const candidate = trimmed.includes("github.com/")
    ? trimmed.split("github.com/").pop()
    : trimmed;

  return candidate?.replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
}, z.string().min(1).max(100).optional());

export const teamSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional().default("")
});

export const projectSchema = z.object({
  organizationId: z.string().min(1),
  teamId: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional().default(""),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"]).default("PLANNED")
});

export const taskSchema = z.object({
  projectId: trimmedString(1),
  assigneeId: optionalTrimmedString,
  title: trimmedString(2),
  description: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().optional().default("")
  ),
  status: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO")
  ),
  priority: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
  )
});

export const timeEntrySchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  action: z.enum(["START", "STOP", "PAUSE", "RESUME"]),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  note: z.string().optional().default("")
});

export const activityLogSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  teamId: z.string().optional(),
  activeApp: z.string().min(1),
  activeWindow: z.string().optional().default(""),
  website: z.string().optional().default(""),
  keyboardPercent: z.number().min(0).max(100),
  mousePercent: z.number().min(0).max(100),
  idleSeconds: z.number().min(0),
  trackingState: z.enum(["ACTIVE", "PAUSED", "IDLE"]).default("ACTIVE"),
  capturedAt: z.string().datetime().optional()
});

export const screenshotSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  teamId: z.string().optional(),
  imageUrl: z.string().min(1),
  capturedAt: z.string().datetime().optional(),
  activeApp: z.string().optional().default(""),
  activeWindow: z.string().optional().default("")
});

export const summarySchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().optional()
});

export const teamMemberSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  teamId: z.string().optional(),
  role: z.enum(["OWNER", "MANAGER", "EMPLOYEE", "INTERN"]).default("EMPLOYEE"),
  status: z.enum(["INVITED", "ACTIVE", "PAUSED", "REMOVED"]).default("INVITED"),
  consentStatus: z.enum(["PENDING", "ACCEPTED", "REVOKED"]).default("PENDING"),
  title: z.string().optional().default("")
});

export const teamMemberUpdateSchema = z.object({
  memberId: z.string().min(1),
  teamId: z.string().optional(),
  role: z.enum(["OWNER", "MANAGER", "EMPLOYEE", "INTERN"]).optional(),
  status: z.enum(["INVITED", "ACTIVE", "PAUSED", "REMOVED"]).optional(),
  consentStatus: z.enum(["PENDING", "ACCEPTED", "REVOKED"]).optional(),
  title: z.string().optional()
});

export const employeeInviteSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: trimmedString(2),
  githubUsername: normalizedGithubUsername,
  role: normalizedRole.default("EMPLOYEE"),
  teamId: optionalTrimmedString,
  title: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().optional().default(""))
});

export const assignmentSchema = z.object({
  employeeId: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().optional()
  ),
  employeeEmail: normalizedEmail.optional(),
  taskId: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, "Select a task before assigning it")
  )
});

export const notificationSchema = z.object({
  title: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(2, "Title must be at least 2 characters")
  ),
  message: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(10, "Message must be at least 10 characters")
  ),
  kind: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.enum(["ANNOUNCEMENT", "REQUEST"]).default("ANNOUNCEMENT")
  ),
  audience: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.enum(["ALL", "ADMINS", "EMPLOYEES", "TEAM"]).default("ALL")
  )
});

const calendarDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .transform((value) => value.trim());

export const leaveRequestSchema = z
  .object({
    startDate: calendarDateString,
    endDate: calendarDateString,
    reason: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.string().min(10, "Reason must be at least 10 characters")
    )
    ,
    documentUrl: z
      .preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().url().optional())
    ,
    teamLeadId: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().optional())
    ,
    projectId: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().optional())
  })
  .refine((value) => new Date(`${value.endDate}T12:00:00`).getTime() >= new Date(`${value.startDate}T12:00:00`).getTime(), {
    message: "End date must be on or after start date",
    path: ["endDate"]
  });

export const timeCorrectionRequestSchema = z
  .object({
    projectId: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.string().min(1, "Select a project before sending the request")
    ),
    requestStartAt: z.string().datetime(),
    requestEndAt: z.string().datetime(),
    reason: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.string().min(10, "Reason must be at least 10 characters")
    )
  })
  .refine((value) => new Date(value.requestEndAt).getTime() > new Date(value.requestStartAt).getTime(), {
    message: "End time must be after start time",
    path: ["requestEndAt"]
  });
