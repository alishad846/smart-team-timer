import Link from "next/link";
import { format } from "date-fns";
import { subHours } from "date-fns";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { summarizeTimeEntries } from "@/lib/time-metrics";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole !== "admin") {
    redirect("/employee");
  }

  const [members, timeEntries, activityLogs, screenshots] = await Promise.all([
    prisma.teamMember.findMany({
      where: { organizationId: context.organization.id },
      include: { user: true, team: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.timeEntry.findMany({
      where: { organizationId: context.organization.id },
      include: { user: true, project: true, task: true },
      orderBy: { startedAt: "desc" }
    }),
    prisma.activityLog.findMany({
      where: {
        organizationId: context.organization.id,
        capturedAt: {
          gte: subHours(new Date(), 24)
        }
      },
      include: { user: true },
      orderBy: { capturedAt: "desc" },
      take: 60
    }),
    prisma.screenshot.findMany({
      where: { organizationId: context.organization.id },
      include: { user: true },
      orderBy: { capturedAt: "desc" },
      take: 12
    })
  ]);

  const { totalTrackedHours } = summarizeTimeEntries(timeEntries);

  const latestEntryByUser = new Map<string, (typeof timeEntries)[number]>();
  for (const entry of timeEntries) {
    if (!latestEntryByUser.has(entry.userId)) {
      latestEntryByUser.set(entry.userId, entry);
    }
  }

  const latestActivityByUser = new Map<string, (typeof activityLogs)[number]>();
  for (const log of activityLogs) {
    if (!latestActivityByUser.has(log.userId)) {
      latestActivityByUser.set(log.userId, log);
    }
  }

  const memberRows = members
    .map((member) => {
      const employeeEntries = timeEntries.filter((entry) => entry.userId === member.userId);
      const trackedMinutes = employeeEntries.reduce((sum, entry) => sum + entry.totalSeconds, 0) / 60;
      const latestEntry = latestEntryByUser.get(member.userId) ?? null;
      const latestActivity = latestActivityByUser.get(member.userId) ?? null;

      return {
        id: member.id,
        name: member.user.fullName,
        githubUsername: member.user.githubUsername,
        activity: latestActivity
          ? `${latestActivity.activeApp}${latestActivity.activeWindow ? ` - ${latestActivity.activeWindow}` : ""}`
          : "No tracker data yet",
        task: latestEntry?.task?.title ?? latestEntry?.project?.name ?? "No task selected",
        timeUsed: formatDuration(trackedMinutes),
        trackedMinutes,
        lastSeen: latestActivity?.capturedAt ?? latestEntry?.startedAt ?? null,
        status: member.status,
        consentStatus: member.consentStatus
      };
    })
    .sort((left, right) => right.trackedMinutes - left.trackedMinutes);

  const activeMembers = members.filter((member) => member.status === "ACTIVE").length;

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Admin overview"
        title="Employee activity snapshot"
        description="Quick view of employee name, current activity, current task, and time used."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/employees">Employees</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/tasks">Tasks</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/notifications">Notifications</Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatDuration(totalTrackedHours * 60)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeMembers}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{screenshots.length}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Employee overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Time used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberRows.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div>{member.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.githubUsername ? `@${member.githubUsername}` : "No GitHub"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[28rem] truncate">{member.activity}</TableCell>
                  <TableCell className="max-w-[20rem] truncate">{member.task}</TableCell>
                  <TableCell>{member.timeUsed}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={member.status === "ACTIVE" ? "success" : "secondary"}>{member.status}</Badge>
                      <Badge variant={member.consentStatus === "ACCEPTED" ? "secondary" : "warning"}>
                        {member.consentStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.lastSeen ? format(member.lastSeen, "MMM d, h:mm a") : "No data yet"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
