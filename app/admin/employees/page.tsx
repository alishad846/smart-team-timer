import Link from "next/link";
import { redirect } from "next/navigation";
import type { Team, TeamMember, Notification, User } from "@prisma/client";

// Type that includes related user and team objects returned by Prisma
type MemberWithRelations = TeamMember & {
  user: User;
  team: Team | null;
};
import { InviteEmployeeForm } from "@/components/admin/admin-forms";
import { RemoveEmployeeButton } from "@/components/admin/remove-employee-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const size = Math.min(Number(resolvedSearchParams.size) || 20, 50);
  const skip = (page - 1) * size;

  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole !== "admin") {
    redirect("/employee");
  }

  const [teams, membersResult, approvedLeaves] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { createdAt: "asc" }
    }),
    prisma.teamMember.findMany({
      where: { organizationId: context.organization.id, status: { not: "REMOVED" } },
      include: { user: true, team: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: size,
    }) as unknown as MemberWithRelations[],
    prisma.notification.findMany({
      where: {
        organizationId: context.organization.id,
        kind: "REQUEST",
        title: { contains: "Leave", mode: "insensitive" },
        requestStatus: "APPROVED",
      },
      select: { id: true, createdById: true, requestStartAt: true, requestEndAt: true },
    })
  ]);

  const totalMembers = await prisma.teamMember.count({
    where: { organizationId: context.organization.id, status: { not: "REMOVED" } },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Employee management"
        title="Add people and review access"
        description="Create employee logins, store their GitHub profile, and open their individual activity page."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Active members</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-3xl font-semibold">{totalMembers}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>GitHub profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{membersResult.filter((member: MemberWithRelations) => Boolean(member.user.githubUsername)).length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{teams.length}</p>
          </CardContent>
        </Card>
      </section>

      <div className="space-y-8">
        <InviteEmployeeForm teams={teams.map((team: Team) => ({ id: team.id, name: team.name }))} />

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Member directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>GitHub</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Consent</TableHead>
                    <TableHead>Leaves</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {membersResult.map((member: MemberWithRelations) => {
                    const userLeaves = approvedLeaves.filter((leave: any) => leave.createdById === member.userId);
                    const now = new Date();
                    const isOnLeaveNow = userLeaves.some((leave: any) => {
                      if (!leave.requestStartAt || !leave.requestEndAt) return false;
                      const start = new Date(leave.requestStartAt);
                      const end = new Date(leave.requestEndAt);
                      return now >= start && now <= end;
                    });

                    const totalLeaveDays = userLeaves.reduce((total: number, leave: any) => {
                      if (!leave.requestStartAt || !leave.requestEndAt) return total;
                      const start = new Date(leave.requestStartAt);
                      const end = new Date(leave.requestEndAt);
                      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                      const diffTime = endDay.getTime() - startDay.getTime();
                      const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24))) + 1;
                      return total + diffDays;
                    }, 0);

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.user.fullName}</TableCell>
                        <TableCell>{member.user.email}</TableCell>
                        <TableCell>{member.user.githubUsername ? `@${member.user.githubUsername}` : "—"}</TableCell>
                        <TableCell>{member.team?.name ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <Badge variant={member.consentStatus === "ACCEPTED" ? "success" : "warning"}>
                            {member.consentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{totalLeaveDays} day{totalLeaveDays === 1 ? "" : "s"} leave</span>
                            {isOnLeaveNow ? (
                              <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                On Leave
                              </Badge>
                            ) : (
                              <Badge variant="success">
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/activity/${member.userId}`}>Open activity</Link>
                          </Button>
                          <RemoveEmployeeButton memberId={member.id} memberName={member.user.fullName} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Pagination */}
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      <div className="flex justify-center items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => window.location.search = `?page=${page - 1}&size=${size}`}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {page} of {Math.ceil(totalMembers / size) || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= Math.ceil(totalMembers / size)}
                          onClick={() => window.location.search = `?page=${page + 1}&size=${size}`}
                        >
                          Next
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
