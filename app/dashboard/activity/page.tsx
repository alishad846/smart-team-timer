import { format, subHours } from "date-fns";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { summarizeTimeEntries } from "@/lib/time-metrics";

function buildAppUsage(activityLogs: { activeApp: string; keyboardPercent: number; mousePercent: number }[]) {
  return activityLogs
    .reduce((acc, log) => {
      const existing = acc.find((item) => item.app === log.activeApp);
      const minutes = Math.max(1, Math.round((log.keyboardPercent + log.mousePercent) / 4));

      if (existing) {
        existing.minutes += minutes;
      } else {
        acc.push({ app: log.activeApp, minutes });
      }

      return acc;
    }, [] as { app: string; minutes: number }[])
    .sort((left, right) => right.minutes - left.minutes)
    .slice(0, 5);
}

export default async function ActivityPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  const scope =
    context.workspaceRole === "admin"
      ? { organizationId: context.organization.id }
      : { organizationId: context.organization.id, userId: context.profile.id };
  const activityLogCutoff = subHours(new Date(), 24);

  const [timeEntries, activityLogs, screenshots] = await Promise.all([
    prisma.timeEntry.findMany({
      where: scope,
      orderBy: { startedAt: "desc" },
      include: { user: true, project: true }
    }),
    prisma.activityLog.findMany({
      where: {
        ...scope,
        capturedAt: {
          gte: activityLogCutoff
        }
      },
      orderBy: { capturedAt: "desc" },
      take: 60,
      include: { user: true }
    }),
    prisma.screenshot.findMany({
      where: scope,
      orderBy: { capturedAt: "desc" },
      take: 8,
      include: { user: true }
    })
  ]);

  const { totalTrackedHours, productiveMinutes, idleMinutes, productivityScore } = summarizeTimeEntries(timeEntries);
  const appUsage = buildAppUsage(activityLogs);
  const latestScreenshots = screenshots.slice(0, 4);
  const lowActivityCount = activityLogs.filter((log) => log.idleSeconds > 15 * 60).length;

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Activity monitoring"
        title="Active apps, websites, and screenshots"
        description="Review the most recent application usage, idle periods, and captured screenshots in one timeline."
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>App usage timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appUsage.length > 0 ? (
              appUsage.map((app, index) => (
                <div key={app.app} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{app.app}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{app.minutes} tracked minutes</p>
                    </div>
                    <Badge variant={index < 2 ? "success" : "secondary"}>{Math.max(1, app.minutes)}m</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(10, (app.minutes / Math.max(appUsage[0]?.minutes ?? 1, 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No activity logs yet. Open the desktop tracker to start syncing app usage.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Screenshot timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestScreenshots.length > 0 ? (
              latestScreenshots.map((shot) => (
                <div key={shot.id} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{format(shot.capturedAt, "HH:mm")}</p>
                    <Badge variant="secondary">{shot.user.fullName}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {shot.activeApp || "Desktop"} - {shot.activeWindow || "No window title"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No screenshots have been captured yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Idle notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Idle sessions are measured from the desktop tracker and synced in near real time.{" "}
            {lowActivityCount > 0
              ? `${lowActivityCount} windows crossed the 15-minute idle threshold in the current workspace.`
              : "No idle windows crossed the 15-minute warning threshold yet."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
