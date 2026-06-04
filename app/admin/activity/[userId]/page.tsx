import { format } from "date-fns";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { loadEmployeeDashboardData } from "@/lib/employee-dashboard";
import { formatDuration } from "@/lib/utils";
import { summarizeTimeEntries } from "@/lib/time-metrics";

export const dynamic = "force-dynamic";

export default async function AdminEmployeeActivityPage({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole !== "admin") {
    redirect("/employee");
  }

  const { userId } = await params;
  const member = await prisma.teamMember.findFirst({
    where: {
      organizationId: context.organization.id,
      userId
    },
    include: {
      user: true,
      team: true
    }
  });

  if (!member) {
    redirect("/admin/activity");
  }

  const data = await loadEmployeeDashboardData({
    organizationId: context.organization.id,
    userId: member.userId
  });

  const totals = summarizeTimeEntries(data.timeEntries);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Individual activity"
        title={member.user.fullName}
        description={`Review a single employee's activity, screenshots, and tracked time.${member.user.githubUsername ? ` GitHub @${member.user.githubUsername}.` : ""}`}
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals.totalTrackedHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totals.productivityScore}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Idle minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{Math.round(totals.idleMinutes)}m</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consent</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={member.consentStatus === "ACCEPTED" ? "success" : "warning"}>{member.consentStatus}</Badge>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Time entries</CardTitle>
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
                {data.timeEntries.slice(0, 10).map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(entry.startedAt, "MMM d, h:mm a")}</TableCell>
                    <TableCell>{entry.project?.name ?? "No project"}</TableCell>
                    <TableCell>{entry.task?.title ?? "No task"}</TableCell>
                    <TableCell>{formatDuration(entry.totalSeconds / 60)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Latest screenshots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.screenshots.slice(0, 6).map((shot: any) => (
                <div key={shot.id} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{format(shot.capturedAt, "h:mm a")}</p>
                    <Badge variant="secondary">{shot.activeApp || "Desktop"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{shot.activeWindow || "No window title"}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>App activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.appUsageData.map((item: any) => (
                <div key={item.app} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{item.app}</p>
                    <Badge variant="secondary">{item.minutes}m</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
