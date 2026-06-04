import { format } from "date-fns";
import { startOfDay } from "date-fns";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ActivityTimeline } from "@/components/employee/activity-timeline";
import { IdleWarning } from "@/components/employee/idle-warning";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWorkspaceContext } from "@/lib/workspace";
import { loadEmployeeDashboardData } from "@/lib/employee-dashboard";
import { formatDuration } from "@/lib/utils";

export default async function EmployeeActivityPage() {
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

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Employee activity"
        title="Your activity"
        description="Review your 24-hour line and time entries."
      />

      <IdleWarning
        enabled={context.membership.consentStatus === "ACCEPTED" && data.timeEntries.some((entry) => entry.status === "RUNNING")}
      />

      <ActivityTimeline
        entries={todayEntries}
        title="Today&apos;s activity line"
        subtitle="A 24-hour view of when the user was active, paused, or idle."
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Timesheet</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.timeEntries.slice(0, 8).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(entry.startedAt, "MMM d")}</TableCell>
                    <TableCell>{entry.project?.name ?? "No project"}</TableCell>
                    <TableCell>{entry.task?.title ?? "No task"}</TableCell>
                    <TableCell>{formatDuration(entry.totalSeconds / 60)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
