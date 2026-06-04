import { format, subHours } from "date-fns";
import { buildAiSummary } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { listNotifications, type NotificationRecord } from "@/lib/notifications";
import { summarizeTimeEntries } from "@/lib/time-metrics";

type EmployeeDataContext = {
  organizationId: string;
  userId: string;
};

export type EmployeeProject = {
  id: string;
  name: string;
};

export type EmployeeTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  projectName: string;
  assigneeId: string | null;
  assigneeName: string | null;
};

export type EmployeeTimeEntry = {
  id: string;
  status: "RUNNING" | "PAUSED" | "STOPPED";
  startedAt: Date;
  endedAt: Date | null;
  updatedAt: Date;
  totalSeconds: number;
  productiveSeconds: number;
  idleSeconds: number;
  projectId: string | null;
  taskId: string | null;
  note: string | null;
  project: { name: string } | null;
  task: { title: string } | null;
};

export type EmployeeActivityLog = {
  id: string;
  capturedAt: Date;
  activeApp: string;
  activeWindow: string;
  keyboardPercent: number;
  mousePercent: number;
  idleSeconds: number;
};

export type EmployeeScreenshot = {
  id: string;
  capturedAt: Date;
  activeApp: string;
  activeWindow: string;
};

export type EmployeeDashboardData = {
  projects: EmployeeProject[];
  tasks: EmployeeTask[];
  assignedTasks: EmployeeTask[];
  timeEntries: EmployeeTimeEntry[];
  activityLogs: EmployeeActivityLog[];
  screenshots: EmployeeScreenshot[];
  notifications: NotificationRecord[];
  activeEntry: EmployeeTimeEntry | null;
  totalTrackedHours: number;
  productiveMinutes: number;
  idleMinutes: number;
  focusSessions: number;
  appSwitches: number;
  lowActivityWindows: string[];
  aiSummary: ReturnType<typeof buildAiSummary>;
  dailyActivity: { day: string; productive: number; idle: number }[];
  weeklyTrend: { week: string; productivity: number }[];
  appUsageData: { app: string; minutes: number }[];
  heatmap: { day: string; hour: string; value: number }[];
};

function buildDailyActivity(timeEntries: EmployeeTimeEntry[]) {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayLabels.map((day, index) => {
    const entries = timeEntries.filter((entry) => entry.startedAt.getDay() === index);
    const productive = entries.reduce((sum, entry) => sum + entry.productiveSeconds, 0) / 3600;
    const idle = entries.reduce((sum, entry) => sum + entry.idleSeconds, 0) / 3600;
    return {
      day,
      productive: Number(productive.toFixed(1)),
      idle: Number(idle.toFixed(1))
    };
  });
}

function buildWeeklyTrend(timeEntries: EmployeeTimeEntry[]) {
  const now = Date.now();
  return Array.from({ length: 4 }, (_, index) => {
    const weekStart = now - (3 - index) * 7 * 24 * 60 * 60 * 1000;
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const entries = timeEntries.filter((entry) => {
      const time = entry.startedAt.getTime();
      return time >= weekStart && time < weekEnd;
    });
    const productive = entries.reduce((sum, entry) => sum + entry.productiveSeconds, 0);
    const idle = entries.reduce((sum, entry) => sum + entry.idleSeconds, 0);
    const score = productive + idle > 0 ? Math.round((productive / (productive + idle)) * 100) : 0;
    return {
      week: `W${index + 1}`,
      productivity: score
    };
  });
}

function buildHeatmap(activityLogs: EmployeeActivityLog[]) {
  const buckets = new Map<string, number>();

  for (const log of activityLogs) {
    const day = format(log.capturedAt, "EEE");
    const hour = format(log.capturedAt, "HH");
    const key = `${day}-${hour}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Math.round((log.keyboardPercent + log.mousePercent) / 2));
  }

  return Array.from(buckets.entries())
    .sort()
    .slice(0, 18)
    .map(([key, value]) => {
      const [day, hour] = key.split("-");
      return { day, hour, value };
    });
}

export async function loadEmployeeDashboardData({ organizationId, userId }: EmployeeDataContext) {
  const activityLogCutoff = subHours(new Date(), 24);
  const [projects, tasks, timeEntries, activityLogs, screenshots, notifications] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.task.findMany({
      where: {
        project: {
          organizationId
        }
      },
      include: {
        project: true,
        assignee: true
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.timeEntry.findMany({
      where: {
        organizationId,
        userId
      },
      include: {
        project: true,
        task: true
      },
      orderBy: { startedAt: "desc" }
    }),
    prisma.activityLog.findMany({
      where: {
        organizationId,
        userId,
        capturedAt: {
          gte: activityLogCutoff
        }
      },
      orderBy: { capturedAt: "desc" },
      take: 60
    }),
    prisma.screenshot.findMany({
      where: {
        organizationId,
        userId
      },
      orderBy: { capturedAt: "desc" },
      take: 12
    }),
    listNotifications(organizationId, 12)
  ]);

  const normalizedTasks: EmployeeTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    projectName: task.project?.name ?? "No project",
    assigneeId: task.assigneeId,
    assigneeName: task.assignee?.fullName ?? null
  }));

  const activeEntry =
    timeEntries.find((entry) => entry.status === "RUNNING" || entry.status === "PAUSED") ?? null;
  const { totalTrackedHours, productiveMinutes, idleMinutes, productivityScore } = summarizeTimeEntries(timeEntries);
  const focusSessions = timeEntries.filter((entry) => entry.totalSeconds >= 25 * 60).length;
  const appSwitches = activityLogs.length;
  const lowActivityWindows = activityLogs
    .filter((log) => log.idleSeconds > 60)
    .map((log) => format(log.capturedAt, "h:mm a"))
    .slice(0, 4);
  const aiSummary = buildAiSummary({
    productiveMinutes,
    idleMinutes,
    focusSessions,
    appSwitches,
    lowActivityWindows
  });

  const appUsageData = activityLogs
    .reduce(
      (acc, log) => {
        const existing = acc.find((item) => item.app === log.activeApp);
        const minutes = Math.max(1, Math.round((log.keyboardPercent + log.mousePercent) / 4));
        if (existing) {
          existing.minutes += minutes;
        } else {
          acc.push({ app: log.activeApp, minutes });
        }
        return acc;
      },
      [] as { app: string; minutes: number }[]
    )
    .sort((left, right) => right.minutes - left.minutes)
    .slice(0, 6);

  return {
    projects: projects.map((project) => ({ id: project.id, name: project.name })),
    tasks: normalizedTasks,
    assignedTasks: normalizedTasks.filter((task) => task.assigneeId === userId),
    timeEntries: timeEntries.map((entry) => ({
      id: entry.id,
      status: entry.status,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      updatedAt: entry.updatedAt,
      totalSeconds: entry.totalSeconds,
      productiveSeconds: entry.productiveSeconds,
      idleSeconds: entry.idleSeconds,
      projectId: entry.projectId,
      taskId: entry.taskId,
      note: entry.note,
      project: entry.project,
      task: entry.task
    })),
    activityLogs: activityLogs.map((log) => ({
      id: log.id,
      capturedAt: log.capturedAt,
      activeApp: log.activeApp,
      activeWindow: log.activeWindow,
      keyboardPercent: log.keyboardPercent,
      mousePercent: log.mousePercent,
      idleSeconds: log.idleSeconds
    })),
    screenshots: screenshots.map((shot) => ({
      id: shot.id,
      capturedAt: shot.capturedAt,
      activeApp: shot.activeApp,
      activeWindow: shot.activeWindow
    })),
    notifications,
    activeEntry: activeEntry
      ? {
          id: activeEntry.id,
          status: activeEntry.status,
          startedAt: activeEntry.startedAt,
          endedAt: activeEntry.endedAt,
          updatedAt: activeEntry.updatedAt,
          totalSeconds: activeEntry.totalSeconds,
          productiveSeconds: activeEntry.productiveSeconds,
          idleSeconds: activeEntry.idleSeconds,
          projectId: activeEntry.projectId,
          taskId: activeEntry.taskId,
          note: activeEntry.note,
          project: activeEntry.project,
          task: activeEntry.task
        }
      : null,
    totalTrackedHours,
    productiveMinutes,
    idleMinutes,
    focusSessions,
    appSwitches,
    lowActivityWindows,
    aiSummary,
    dailyActivity: buildDailyActivity(timeEntries.map((entry) => ({
      ...entry,
      project: entry.project ? { name: entry.project.name } : null,
      task: entry.task ? { title: entry.task.title } : null
    }))),
    weeklyTrend: buildWeeklyTrend(
      timeEntries.map((entry) => ({
        ...entry,
        project: entry.project ? { name: entry.project.name } : null,
        task: entry.task ? { title: entry.task.title } : null
      }))
    ),
    appUsageData,
    heatmap: buildHeatmap(activityLogs)
  } satisfies EmployeeDashboardData;
}
