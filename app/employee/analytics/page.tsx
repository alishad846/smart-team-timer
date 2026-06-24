import Link from "next/link";
import { format, subHours } from "date-fns";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProductivityChart, FocusChart } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import {
  buildActivitySnapshot,
  getCurrentMonthWeekFilter,
  getMonthWeekLabel,
  getMonthWeekRange,
  getActivityPeriodLabel,
  getActivityPeriodRange,
  normalizeMonthWeekFilter,
  normalizeActivityPeriod,
  type ActivityPeriod,
  type MonthWeekFilter
} from "@/lib/activity-periods";
import { cn, formatDuration, formatPercent } from "@/lib/utils";
import type { ActivityLog, TimeEntry } from "@prisma/client";

const periodOptions: Array<{ value: ActivityPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const monthWeekOptions: Array<{ value: MonthWeekFilter; label: string }> = [
  { value: "week1", label: "Week 1" },
  { value: "week2", label: "Week 2" },
  { value: "week3", label: "Week 3" },
  { value: "week4", label: "Week 4" },
];

type SearchParams = {
  period?: string;
  week?: string;
};

export default async function EmployeeAnalyticsPage(props: {
  searchParams?: Promise<SearchParams>;
}) {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole === "admin") {
    redirect("/admin");
  }

  const searchParams = (await props.searchParams) ?? {};
  const period = normalizeActivityPeriod(searchParams.period);
  const now = new Date();
  const monthWeek = normalizeMonthWeekFilter(searchParams.week);
  const defaultWeek = getCurrentMonthWeekFilter(now);
  const selectedWeek = period === "weekly" ? monthWeek : "all";
  const activeWeek = period === "weekly"
    ? selectedWeek === "all"
      ? defaultWeek
      : selectedWeek
    : "all";

  const monthlyRange = getActivityPeriodRange("monthly", now);
  const selectedRange =
    period === "weekly"
      ? getMonthWeekRange(activeWeek, now)
      : period === "monthly"
        ? monthlyRange
        : getActivityPeriodRange(period, now);

  const selectedRangeEnd = selectedRange.end.getTime() > now.getTime() ? now : selectedRange.end;
  const activityLogCutoff = subHours(now, 24);
  const periodLabel =
    period === "weekly"
      ? `${getMonthWeekLabel(activeWeek)} of this month`
      : period === "monthly"
        ? "Last 6 months"
        : getActivityPeriodLabel(period);

  const [timeEntries, activityLogs] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        organizationId: context.organization.id,
        userId: context.profile.id,
        startedAt: {
          gte: selectedRange.start,
          lte: selectedRangeEnd,
        },
      },
      orderBy: { startedAt: "desc" },
      include: {
        project: true,
        task: true,
      },
    }),
    prisma.activityLog.findMany({
      where: {
        organizationId: context.organization.id,
        userId: context.profile.id,
        capturedAt: {
          gte: activityLogCutoff,
          lte: selectedRangeEnd,
        },
      },
      orderBy: { capturedAt: "desc" },
      take: 60,
    }),
  ]);

  const snapshot = buildActivitySnapshot(timeEntries, period, selectedRangeEnd, {
    label: periodLabel,
    rangeStart: selectedRange.start,
    rangeEnd: selectedRangeEnd,
  });

  const trendData = snapshot.buckets;
  const lowActivityWindows = activityLogs
    .filter((log: ActivityLog) => log.idleSeconds > 15 * 60)
    .map((log) => format(log.capturedAt, "h:mm a"))
    .slice(0, 4);

  function buildAnalyticsHref(nextPeriod: ActivityPeriod, nextWeek: MonthWeekFilter = defaultWeek) {
    const params = new URLSearchParams();
    params.set("period", nextPeriod);
    if (nextPeriod === "weekly") {
      params.set("week", nextWeek);
    }
    const query = params.toString();
    return query ? `/employee/analytics?${query}` : "/employee/analytics";
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Employee analytics"
        title="Your activity by period"
        description={`Switch between daily, weekly month slices, and monthly history to review your overall activity.`}
      />

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/70 bg-card/80 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Activity filters</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {period === "weekly"
              ? `Showing ${periodLabel.toLowerCase()} activity and credits.`
              : "Showing monthly history and credits."}
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => {
              const active = option.value === period;
              return (
                <Link
                  key={option.value}
                  href={buildAnalyticsHref(option.value) as any}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
          {period === "weekly" ? (
            <div className="flex flex-wrap gap-2">
              {monthWeekOptions.map((option) => {
                const active = activeWeek === option.value;
                return (
                  <Link
                    key={option.value}
                    href={buildAnalyticsHref("weekly", option.value) as any}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard
          label={
            period === "daily"
              ? "Active work time today"
              : period === "weekly"
                ? `Active work time for ${getMonthWeekLabel(activeWeek)}`
                : "Active work time over the last 6 months"
          }
          value={formatDuration(snapshot.productiveMinutes)}
          delta={periodLabel}
          helper="Productive work time in the selected period."
        />
        <StatCard
          label="Activity score"
          value={formatPercent(snapshot.productivityScore)}
          delta="Overall"
          helper="Based on productive time versus idle time."
        />
        <StatCard
          label="Credits earned"
          value={`${snapshot.creditsEarned}`}
          delta={`Goal ${snapshot.creditTarget}`}
          helper="1 hour of productive work earns 3 credits."
        />
        <StatCard
          label="Streak"
          value={`${snapshot.streakDays} days`}
          delta="Motivation"
          helper="Consecutive days meeting the daily credit goal."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ProductivityChart data={trendData} title={`${periodLabel} activity`} />
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Overall activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              {period === "weekly"
                ? `This week view uses ${timeEntries.length} time entries and ${activityLogs.length} tracker samples.`
                : `This monthly history view uses ${timeEntries.length} time entries and ${activityLogs.length} tracker samples.`}
            </p>
            <p>
              Your activity score is {snapshot.productivityScore}% because you spent {Math.round(snapshot.productiveMinutes)}m in productive time
              {period === "weekly" ? ` during ${getMonthWeekLabel(activeWeek)}` : ""}.
            </p>
            <p>
              {lowActivityWindows.length > 0
                ? `Low activity windows: ${lowActivityWindows.join(", ")}`
                : "No idle windows crossed the warning threshold in this period."}
            </p>
            <p>Daily target: 3 credits. Weekly target: 72 credits. Monthly target: 280 credits.</p>
            <p>Activity logs are only kept in the current 24-hour window so the dashboard stays fast and smooth.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <FocusChart productiveTime={snapshot.productiveMinutes} idleTime={snapshot.idleMinutes} />
      </section>
    </div>
  );
}
