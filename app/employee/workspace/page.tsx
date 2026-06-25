import { redirect } from "next/navigation";
import type { EmployeeTimeEntry, EmployeeActivityLog, EmployeeProject } from "@/lib/employee-dashboard";
import { startOfDay } from "date-fns";
import { format } from "date-fns";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActivityTimeline } from "@/components/employee/activity-timeline";
import { IdleWarning } from "@/components/employee/idle-warning";
import { TimerPanel } from "@/components/employee/timer-panel";
import { TrackingConsentCard } from "@/components/employee/tracking-consent-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignedTasksList } from "@/components/employee/assigned-tasks-list";
import { TesterQueue, type TestableTask } from "@/components/employee/tester-queue";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { loadEmployeeDashboardData } from "@/lib/employee-dashboard";
import { buildActivitySnapshot } from "@/lib/activity-periods";
import { WorkspaceSummaryCards } from "@/components/employee/workspace-summary-cards";

export default async function EmployeeWorkspacePage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole === "admin") {
    redirect("/admin");
  }

  const data = await loadEmployeeDashboardData({
    organizationId: context.organization.id,
    userId: context.profile.id
  });

  const todayStart = startOfDay(new Date());
  const todayEntries = data.timeEntries.filter((entry: EmployeeTimeEntry) => entry.startedAt >= todayStart);
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentEntries = data.timeEntries.filter((entry: EmployeeTimeEntry) => entry.startedAt >= cutoff);
  const todayLogs = data.activityLogs.filter((log: EmployeeActivityLog) => log.capturedAt >= todayStart);
  const todaySnapshot = buildActivitySnapshot(todayEntries, "daily", new Date());
  const assignedProjects = data.projects.filter((project: EmployeeProject) =>
    data.assignedTasks.some((task) => task.projectId === project.id)
  );

  let testableTasks: TestableTask[] = [];
  if (context.profile.role === "TESTER") {
    const rawTasks = await prisma.task.findMany({
      where: {
        status: "REVIEW",
        project: {
          organizationId: context.organization.id
        }
      },
      include: {
        project: true,
        assignee: true
      },
      orderBy: { updatedAt: "desc" }
    });
    testableTasks = rawTasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectName: t.project?.name ?? null,
      assigneeName: t.assignee?.fullName ?? null
    }));
  }
  
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Employee workspace"
        title={`Welcome back, ${context.profile.fullName}`}
        description="Start your timer, choose your active task, and keep your work session clean and transparent."
      />

      <TrackingConsentCard consentStatus={context.membership.consentStatus} />
      <IdleWarning enabled={context.membership.consentStatus === "ACCEPTED" && data.activeEntry?.status === "RUNNING"} />

      {context.profile.role === "TESTER" && testableTasks.length > 0 && (
        <TesterQueue tasks={testableTasks} />
      )}

      <WorkspaceSummaryCards
        userId={context.profile.id}
        organizationId={context.organization.id}
        initialEntries={data.timeEntries.map((entry: EmployeeTimeEntry) => ({
          startedAt: entry.startedAt.toISOString(),
          productiveSeconds: entry.productiveSeconds,
          idleSeconds: entry.idleSeconds,
          totalSeconds: entry.totalSeconds
        }))}
        initialSummary={{
          todayProductiveMinutes: todaySnapshot.productiveMinutes,
          todayProductivityScore: todaySnapshot.productivityScore,
          todayCreditsEarned: todaySnapshot.creditsEarned,
          streakDays: buildActivitySnapshot(data.timeEntries, "weekly", new Date()).streakDays
        }}
      />

      <section>
        <ActivityTimeline
          entries={recentEntries}
          title="Today&apos;s 24-hour line"
          subtitle="A flat 24-hour timeline showing when the employee was active today."
        />
      </section>

      <section id="workspace">
        <TimerPanel
          userId={context.profile.id}
          organizationId={context.organization.id}
          teamId={context.membership.teamId}
          consentStatus={context.membership.consentStatus}
          projects={assignedProjects}
          tasks={data.assignedTasks.map((task) => ({
            id: task.id,
            title: task.title,
            projectId: task.projectId,
            description: task.description
          }))}
          initialEntry={
            context.membership.consentStatus === "ACCEPTED" && data.activeEntry
              ? {
                  id: data.activeEntry.id,
                  status: data.activeEntry.status,
                  startedAt: data.activeEntry.startedAt.toISOString(),
                  totalSeconds: data.activeEntry.totalSeconds,
                  productiveSeconds: data.activeEntry.productiveSeconds,
                  idleSeconds: data.activeEntry.idleSeconds,
                  updatedAt: data.activeEntry.updatedAt.toISOString(),
                  projectId: data.activeEntry.projectId,
                  taskId: data.activeEntry.taskId,
                  note: data.activeEntry.note
                }
              : null
          }
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AssignedTasksList
          tasks={data.assignedTasks.map((task) => ({
            id: task.id,
            title: task.title,
            projectName: task.projectName,
            status: task.status
          }))}
        />

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Today&apos;s snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Current project</p>
              <p className="mt-2 font-medium">{data.activeEntry?.project?.name ?? "No active project"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Current task</p>
              <p className="mt-2 font-medium">{data.activeEntry?.task?.title ?? "No active task"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Today&apos;s idle time</p>
              <p className="mt-2 font-medium">{Math.round(todaySnapshot.idleMinutes)}m</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Last update</p>
              <p className="mt-2 font-medium">
                {todayLogs[0] ? format(todayLogs[0].capturedAt, "MMM d, h:mm a") : "No tracker data yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
