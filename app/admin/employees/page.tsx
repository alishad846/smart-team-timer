import Link from "next/link";
import { redirect } from "next/navigation";
import { InviteEmployeeForm } from "@/components/admin/admin-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole !== "admin") {
    redirect("/employee");
  }

  const [teams, members] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { createdAt: "asc" }
    }),
    prisma.teamMember.findMany({
      where: { organizationId: context.organization.id },
      include: { user: true, team: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

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
            <p className="text-3xl font-semibold">{members.filter((member) => member.status === "ACTIVE").length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>GitHub profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{members.filter((member) => Boolean(member.user.githubUsername)).length}</p>
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <InviteEmployeeForm teams={teams.map((team) => ({ id: team.id, name: team.name }))} />

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Member directory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>GitHub</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.user.fullName}</TableCell>
                    <TableCell>{member.user.githubUsername ? `@${member.user.githubUsername}` : "—"}</TableCell>
                    <TableCell>{member.team?.name ?? "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge variant={member.consentStatus === "ACCEPTED" ? "success" : "warning"}>
                        {member.consentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/activity/${member.userId}`}>Open activity</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
