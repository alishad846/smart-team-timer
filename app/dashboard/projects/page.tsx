import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { tasks, projects } from "@/lib/mock-data";
import { formatPercent } from "@/lib/utils";

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Project planning"
        title="Assign projects and tasks"
        description="Keep work organized by linking every timer session to a project and active task."
        actions={<Button>New project</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.name} className="border-border/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{project.name}</CardTitle>
                <Badge variant="secondary">{formatPercent(project.progress)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Owner: {project.owner}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">Due {project.due}</div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${project.progress}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Task board</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasks.map((task) => (
              <div key={task.title} className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Assigned to {task.assignee}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary">{task.status}</Badge>
                    <Badge variant={task.priority === "High" ? "warning" : "default"}>{task.priority}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Quick assign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select defaultValue="engineering">
              <option value="engineering">Engineering</option>
              <option value="design">Design</option>
              <option value="intern">Intern Cohort</option>
            </Select>
            <Select defaultValue="maya">
              <option value="maya">Maya Patel</option>
              <option value="aarav">Aarav Singh</option>
              <option value="jordan">Jordan Lee</option>
            </Select>
            <Textarea placeholder="Describe the task scope, acceptance criteria, and deadline..." />
            <Button className="w-full">Create task</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
