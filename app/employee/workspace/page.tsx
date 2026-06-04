import { redirect } from "next/navigation";
import { startOfDay } from "date-fns";
import { format } from "date-fns";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActivityTimeline } from "@/components/employee/activity-timeline";
import { IdleWarning } from "@/components/employee/idle-warning";
import { StatCard } from "@/components/dashboard/stat-card";
import { TimerPanel } from "@/components/employee/timer-panel";
import { TrackingConsentCard } from "@/components/employee/tracking-consent-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatPercent } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import { loadEmployeeDashboardData } from "@/lib/employee-dashboard";
import { buildActivitySnapshot } from "@/lib/activity-periods";

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
  const todayEntries = data.timeEntries.filter((entry) => entry.startedAt >= todayStart);
  const todayLogs = data.activityLogs.filter((log) => log.capturedAt >= todayStart);
  const todaySnapshot = buildActivitySnapshot(todayEntries, "daily", new Date());
  const streakSnapshot = buildActivitySnapshot(data.timeEntries, "weekly", new Date());
  const assignedProjects = data.projects.filter((project) =>
    data.assignedTasks.some((task) => task.projectId === project.id)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Employee workspace"
        title={`Welcome back, ${context.profile.fullName}`}
        description="Start your timer, choose your active task, and keep your work session clean and transparent."
      />

      <TrackingConsentCard consentStatus={context.membership.consentStatus} />
      <IdleWarning enabled={context.membership.consentStatus === "ACCEPTED" && data.activeEntry?.status === "RUNNING"} />

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Active work time today"
          value={formatDuration(todaySnapshot.productiveMinutes)}
          delta="Resets daily"
          helper="This shows productive work only and resets at midnight."
        />
        <StatCard
          label="Activity score"
          value={formatPercent(todaySnapshot.productivityScore)}
          delta="Today"
          helper="Based on productive time versus idle time."
        />
        <StatCard
          label="Credits earned"
          value={`${todaySnapshot.creditsEarned}`}
          delta="1 hr = 3"
          helper="1 hour of productive work earns 3 credits."
        />
        <StatCard
          label="Streak"
          value={`${streakSnapshot.streakDays} days`}
          delta="Motivation"
          helper="Consecutive days meeting the daily credit goal."
        />
      </section>

      <section>
        <ActivityTimeline
          entries={todayEntries}
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
            projectId: task.projectId
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
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Assigned tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.assignedTasks.length === 0 ? (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                No tasks have been assigned to your email yet.
              </div>
            ) : null}
            {data.assignedTasks.slice(0, 6).map((task) => (
              <div key={task.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{task.projectName}</p>
                  </div>
                  <Badge variant="secondary">{task.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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
