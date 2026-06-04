import Link from "next/link";
import { redirect } from "next/navigation";
import { subHours } from "date-fns";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { summarizeTimeEntries } from "@/lib/time-metrics";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
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
      include: { user: true },
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
      take: 8
    })
  ]);

  const { totalTrackedHours, productiveMinutes, idleMinutes, productivityScore } = summarizeTimeEntries(timeEntries);

  const memberStats = members
    .map((member) => {
      const employeeEntries = timeEntries.filter((entry) => entry.userId === member.userId);
      const productive = employeeEntries.reduce((sum, entry) => sum + entry.productiveSeconds, 0);
      const idle = employeeEntries.reduce((sum, entry) => sum + entry.idleSeconds, 0);
      const score = productive + idle > 0 ? Math.round((productive / (productive + idle)) * 100) : 0;

      return {
        id: member.userId,
        name: member.user.fullName,
        team: member.team?.name ?? "Unassigned",
        githubUsername: member.user.githubUsername,
        score,
        consentStatus: member.consentStatus,
        lastSeen: employeeEntries[0]?.startedAt ?? null
      };
    })
    .sort((left, right) => right.score - left.score);

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Activity monitoring"
        title="Inspect workspace activity"
        description="Open a person's detail page to review their time entries, screenshots, and app usage."
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalTrackedHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{productivityScore}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Idle minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{Math.round(idleMinutes)}m</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Focus minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{Math.round(productiveMinutes)}m</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Employee activity directory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>GitHub</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberStats.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.githubUsername ? `@${member.githubUsername}` : "-"}</TableCell>
                    <TableCell>{member.team}</TableCell>
                    <TableCell>{member.score}%</TableCell>
                    <TableCell>
                      <Badge variant={member.consentStatus === "ACCEPTED" ? "success" : "warning"}>
                        {member.consentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/activity/${member.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Recent evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {screenshots.map((shot) => (
              <div key={shot.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="font-medium">{shot.user.fullName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {shot.activeApp || "Desktop"} - {shot.activeWindow || "No window title"}
                </p>
              </div>
            ))}
            {activityLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No activity logs yet. The desktop tracker will populate this once employees grant permission and start work.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
