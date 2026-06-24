import { redirect } from "next/navigation";
import type { Team, TeamMember, TimeEntry, Project, Task } from "@prisma/client";
import { startOfDay, subHours, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { Users, Clock, Radio, Activity } from "lucide-react";
import { TeamLeadTaskForm } from "@/components/employee/team-lead-task-form";

export const dynamic = "force-dynamic";

// Extended type for teams with members and user relation
type LedTeam = Team & {
  members: (TeamMember & { user: any })[];
};

// TimeEntry with included relations
type TimeEntryFull = TimeEntry & {
  project: Project | null;
  task: Task | null;
};

export default async function TeamLeadPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  // Find all teams where this user is the Team Lead
  // Explicitly type the result to avoid implicit any in callbacks
  const ledTeams: LedTeam[] = await prisma.team.findMany({
    where: {
      organizationId: context.organization.id,
      leaderId: context.profile.id,
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (ledTeams.length === 0) {
    redirect("/employee");
  }

  // teamMemberIds now has a proper inferred type (string[])
  const teamMemberIds: string[] = ledTeams.flatMap((team) =>
    team.members.map((m) => m.userId),
  );

  // Find all projects assigned to the teams managed by this Team Lead
  // Explicitly type ledTeamIds for clarity
  const ledTeamIds: string[] = ledTeams.map((team: LedTeam) => team.id);
  const projects = await prisma.project.findMany({
    where: {
      organizationId: context.organization.id,
      teamId: { in: ledTeamIds }
    },
    select: {
      id: true,
      name: true,
      teamId: true
    }
  });

  // Fetch relevant today's progress & status data for team members
  const [runningEntries, todayEntries, latestLogs] = await Promise.all([
    // Currently active timers
    prisma.timeEntry.findMany({
      where: {
        userId: { in: teamMemberIds },
        status: "RUNNING"
      },
      include: {
        project: true,
        task: true
      }
    }),
    // All of today's time entries
    prisma.timeEntry.findMany({
      where: {
        userId: { in: teamMemberIds },
        startedAt: {
          gte: startOfDay(new Date())
        }
      }
    }),
    // Latest activity log for active app/window/percentages
    prisma.activityLog.findMany({
      where: {
        userId: { in: teamMemberIds },
        capturedAt: {
          gte: subHours(new Date(), 24)
        }
      },
      orderBy: { capturedAt: "desc" }
    })
  ]);

  // Index maps for lookup
  const runningEntriesByUserId: Map<string, TimeEntryFull> = new Map(runningEntries.map((e: TimeEntryFull) => [e.userId, e]));
  
  const todayMinutesByUserId = new Map<string, number>();
  for (const entry of todayEntries) {
    const current = todayMinutesByUserId.get(entry.userId) ?? 0;
    const durationMinutes = entry.totalSeconds / 60;
    todayMinutesByUserId.set(entry.userId, current + durationMinutes);
  }

  const latestLogByUserId = new Map<string, (typeof latestLogs)[number]>();
  for (const log of latestLogs) {
    if (!latestLogByUserId.has(log.userId)) {
      latestLogByUserId.set(log.userId, log);
    }
  }

  // Calculate team wide metrics
  const activeMembersCount = runningEntries.length;
  const totalTrackedMinutesToday = todayEntries.reduce((sum: number, entry: TimeEntry) => sum + entry.totalSeconds, 0) / 60;

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Team Lead Dashboard"
        title="My Team Overview"
        description="Monitor team progress, check active time tracking sessions, and track daily activity."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              Team Tracked Time Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatDuration(totalTrackedMinutesToday)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/70 bg-gradient-to-br from-sky-500/5 to-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-sky-500 animate-pulse" />
              Currently Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeMembersCount} / {teamMemberIds.length} working</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Total Teams Managed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{ledTeams.length} Team{ledTeams.length === 1 ? "" : "s"}</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr] items-start">
        <div className="space-y-6">
          {ledTeams.map((team) => {
            const teamMembers = team.members.filter((m) => m.status !== "REMOVED");

            return (
              <Card key={team.id} className="border-border/70">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {team.name}
                  </CardTitle>
                  {team.description ? (
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Current Task</TableHead>
                        <TableHead>Today's Time</TableHead>
                        <TableHead>Keyboard / Mouse</TableHead>
                        <TableHead>Last App / Window Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                            No active members in this team.
                          </TableCell>
                        </TableRow>
                      ) : (
                        teamMembers.map((member) => {
                          const isWorking = runningEntriesByUserId.has(member.userId);
                          const currentEntry = runningEntriesByUserId.get(member.userId);
                          const todayMinutes = todayMinutesByUserId.get(member.userId) ?? 0;
                          const latestLog = latestLogByUserId.get(member.userId);

                          return (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium py-4">
                                <div>{member.user.fullName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {member.userId === team.leaderId ? "team lead" : (member.title || member.role.toLowerCase())}
                                </div>
                              </TableCell>
                              <TableCell>
                                {isWorking ? (
                                  <Badge variant="success" className="flex items-center gap-1.5 w-fit">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-muted-foreground w-fit">
                                    Offline
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {isWorking && currentEntry ? (
                                  <div>
                                    <span className="font-medium text-sm block truncate">
                                      {currentEntry.task?.title ?? "Tracking Project"}
                                    </span>
                                    <span className="text-xs text-muted-foreground block truncate">
                                      {currentEntry.project?.name ?? "No Project"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold text-sm">{formatDuration(todayMinutes)}</span>
                              </TableCell>
                              <TableCell>
                                {latestLog ? (
                                  <div className="text-xs space-y-1">
                                    <div className="flex justify-between w-24">
                                      <span>Keyboard:</span>
                                      <span className="font-medium">{latestLog.keyboardPercent}%</span>
                                    </div>
                                    <div className="flex justify-between w-24">
                                      <span>Mouse:</span>
                                      <span className="font-medium">{latestLog.mousePercent}%</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[240px] truncate">
                                {latestLog ? (
                                  <div>
                                    <span className="text-xs font-medium block truncate">
                                      {latestLog.activeApp}
                                    </span>
                                    {latestLog.activeWindow ? (
                                      <span className="text-[10px] text-muted-foreground block truncate">
                                        {latestLog.activeWindow}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div>
          <TeamLeadTaskForm projects={projects} teams={ledTeams} />
        </div>
      </div>
    </div>
  );
}
