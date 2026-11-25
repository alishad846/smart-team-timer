"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateProjectForm, CreateTaskForm, AssignWorkForm, DeleteTaskButton } from "@/components/admin/admin-forms";
import { ProjectsBoard } from "@/components/admin/projects-board";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaginatedData } from "@/lib/data-fetch";

interface Team {
  id: string;
  name: string;
}

interface User {
  id: string;
  fullName: string;
  githubUsername: string | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  teamId: string | null;
  team: { id: string; name: string } | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  project: Project | null;
  assignee: User | null;
  assigneeId: string | null;
}

interface MemberWithRelations {
  id: string;
  userId: string;
  teamId: string | null;
  role: string;
  status: string;
  consentStatus: string;
  user: User;
  team: Team | null;
}

interface AdminTasksResponse {
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  totalTasks: number;
  members: MemberWithRelations[];
  page: number;
  size: number;
  totalPages: number;
}

export default function AdminTasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const size = Math.min(Number(searchParams.get("size")) || 20, 50);

  const { data: tasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = usePaginatedData<Task>(
    "/api/admin/tasks",
    page,
    size,
    { ttl: 5 * 60 * 1000 }
  );

  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [staticLoading, setStaticLoading] = useState(true);
  const [staticError, setStaticError] = useState<Error | null>(null);

  // Fetch static data (teams, projects, members) once
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        setStaticLoading(true);
        const response = await fetch("/api/admin/tasks");
        if (response.ok) {
          const result: AdminTasksResponse = await response.json();
          setTeams(result.teams);
          setProjects(result.projects);
          setMembers(result.members);
          setTotalTasks(result.totalTasks);
          setTotalPages(result.totalPages);
        }
      } catch (err) {
        setStaticError(err instanceof Error ? err : new Error("Failed to load data"));
      } finally {
        setStaticLoading(false);
      }
    };

    fetchStaticData();
  }, []);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/admin/tasks?${params.toString()}`);
  };

  if (staticLoading && !projects.length) {
    return (
      <div className="space-y-8">
        <PageHeader
          badge="Task management"
          title="Create projects and assign work"
          description="Use GitHub-backed employee selection and keep all task creation in one dedicated area."
        />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (staticError) {
    return (
      <div className="space-y-8">
        <PageHeader
          badge="Task management"
          title="Create projects and assign work"
          description="Use GitHub-backed employee selection and keep all task creation in one dedicated area."
        />
        <Card className="border-border/70">
          <CardContent className="py-8 text-center text-destructive">
            Failed to load data. <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tasksResult = tasks || [];

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
            <p className="text-3xl font-semibold">{tasksResult.length}</p>
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
        <CreateProjectForm organizationId={projects[0]?.id || ""} teams={teams.map((team: Team) => ({ id: team.id, name: team.name }))} />
        <CreateTaskForm
          projects={projects.map((project: Project) => ({ id: project.id, name: project.name }))}
        />
      </div>

      <ProjectsBoard
        initialProjects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          teamId: p.teamId,
          team: p.team ? { id: p.team.id, name: p.team.name } : null
        }))}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      />

      <AssignWorkForm
        employees={members.map((member: MemberWithRelations) => ({
          id: member.userId,
          name: member.user.fullName,
          githubUsername: member.user.githubUsername
        }))}
        tasks={tasksResult.filter((task) => !task.assigneeId).map((task) => ({
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
          {tasksLoading && tasksResult.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : tasksError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load tasks. <Button variant="outline" size="sm" onClick={refetchTasks}>Retry</Button>
            </div>
          ) : (
            <>
              {tasksResult.map((task) => (
                <div key={task.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.project?.name ?? "No project"} - {task.assignee?.fullName ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{task.status}</Badge>
                        <Badge variant={task.priority === "HIGH" ? "warning" : "default"}>{task.priority}</Badge>
                        <DeleteTaskButton taskId={task.id} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {tasksResult.length === 0 && !tasksLoading && (
                <div className="text-center py-8 text-muted-foreground">No tasks found</div>
              )}
              <div className="flex justify-center items-center gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
