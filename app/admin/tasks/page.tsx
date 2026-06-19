import { redirect } from "next/navigation";
import { CreateProjectForm, CreateTaskForm, AssignWorkForm } from "@/components/admin/admin-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole !== "admin") {
    redirect("/employee");
  }

  const [teams, projects, tasks, members] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { createdAt: "asc" }
    }),
    prisma.project.findMany({
      where: { organizationId: context.organization.id },
      include: { team: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.task.findMany({
      where: {
        project: {
          organizationId: context.organization.id
        }
      },
      include: {
        project: true,
        assignee: true
      },
      orderBy: { updatedAt: "desc" }
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
        badge="Task management"
        title="Create projects and assign work"
        description="Use GitHub-backed employee selection and keep all task creation in one dedicated area."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Assignable employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{members.length}</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <CreateProjectForm organizationId={context.organization.id} teams={teams.map((team) => ({ id: team.id, name: team.name }))} />
        <CreateTaskForm
          projects={projects.map((project) => ({ id: project.id, name: project.name }))}
        />
      </div>

      <AssignWorkForm
        employees={members.map((member) => ({
          id: member.userId,
          name: member.user.fullName,
          githubUsername: member.user.githubUsername
        }))}
        tasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          projectName: task.project?.name ?? "No project"
        }))}
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Task board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {task.project?.name ?? "No project"} - {task.assignee?.fullName ?? "Unassigned"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary">{task.status}</Badge>
                  <Badge variant={task.priority === "HIGH" ? "warning" : "default"}>{task.priority}</Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
