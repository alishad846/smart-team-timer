"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type TeamOption = {
  id: string;
  name: string;
};

type MemberOption = {
  id: string;
  name: string;
  githubUsername: string | null;
};

type TaskOption = {
  id: string;
  title: string;
  projectName: string;
};

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return { error: text };
  }
}

export function InviteEmployeeForm({ teams }: { teams: TeamOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    githubUsername: "",
    password: "",
    role: "EMPLOYEE",
    teamId: teams[0]?.id ?? "",
    title: ""
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        githubUsername: form.githubUsername.trim(),
        password: form.password,
        role: form.role,
        teamId: form.teamId.trim() || undefined,
        title: form.title.trim()
      };

      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not create employee");
      }

      setSuccess(`${data.employee.fullName} invited successfully`);
      setForm((current) => ({
        ...current,
        fullName: "",
        email: "",
        githubUsername: "",
        password: "",
        title: ""
      }));
      router.refresh();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not create employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Superadmin action
        </Badge>
        <CardTitle>Create employee login</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              placeholder="Maya Patel"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="employee@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="githubUsername">GitHub username</Label>
            <Input
              id="githubUsername"
              value={form.githubUsername}
              onChange={(event) => setForm((current) => ({ ...current, githubUsername: event.target.value }))}
              placeholder="shadcn"
            />
            <p className="text-xs text-muted-foreground">
              Paste a GitHub username or profile URL. It will be stored on the employee profile.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Create a strong password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              id="role"
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="INTERN">Intern</option>
              <option value="MANAGER">Manager</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamId">Team</Label>
            <Select
              id="teamId"
              value={form.teamId}
              onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))}
            >
              {teams.length === 0 ? <option value="">No team yet</option> : null}
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Frontend Intern"
            />
          </div>
          <div className="md:col-span-2">
            {error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                {success}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Invite employee"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CreateProjectForm({
  organizationId,
  teams
}: {
  organizationId: string;
  teams: TeamOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    teamId: teams[0]?.id ?? "",
    status: "PLANNED"
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          organizationId,
          name: form.name.trim(),
          description: form.description.trim(),
          teamId: form.teamId.trim() || undefined,
          status: form.status
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not create project");
      }

      setSuccess(`${data.project.name} created successfully`);
      setForm((current) => ({
        ...current,
        name: "",
        description: ""
      }));
      router.refresh();
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : "Could not create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Project action
        </Badge>
        <CardTitle>Create project</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="projectName">Project name</Label>
            <Input
              id="projectName"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Website revamp"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectTeam">Team</Label>
            <Select
              id="projectTeam"
              value={form.teamId}
              onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))}
            >
              {teams.length === 0 ? <option value="">No team yet</option> : null}
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="projectDescription">Description</Label>
            <Textarea
              id="projectDescription"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Scope, goals, and delivery milestones."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectStatus">Status</Label>
            <Select
              id="projectStatus"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="PLANNED">Planned</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On hold</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            {error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                {success}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CreateTaskForm({
  projects,
  employees
}: {
  projects: { id: string; name: string }[];
  employees: MemberOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? "",
    assigneeId: employees[0]?.id ?? "",
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM"
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (projects.length === 0) {
      setError("Create a project first, then create a task.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId: form.projectId.trim(),
          assigneeId: form.assigneeId.trim() || undefined,
          title: form.title.trim(),
          description: form.description.trim(),
          status: form.status,
          priority: form.priority
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not create task");
      }

      setSuccess(`${data.task.title} created successfully`);
      setForm((current) => ({
        ...current,
        title: "",
        description: ""
      }));
      router.refresh();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Could not create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Task action
        </Badge>
        <CardTitle>Create task</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="taskProject">Project</Label>
            <Select
              id="taskProject"
              value={form.projectId}
              onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}
              disabled={projects.length === 0}
            >
              {projects.length === 0 ? <option value="">No project yet</option> : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskAssignee">Assignee</Label>
            <Select
              id="taskAssignee"
              value={form.assigneeId}
              onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))}
              disabled={employees.length === 0}
            >
              {employees.length === 0 ? <option value="">No employee yet</option> : null}
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.githubUsername ? ` @${employee.githubUsername}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskTitle">Task title</Label>
            <Input
              id="taskTitle"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Prepare release notes"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskPriority">Priority</Label>
            <Select
              id="taskPriority"
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="taskDescription">Description</Label>
            <Textarea
              id="taskDescription"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Scope, checklist, and acceptance criteria."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskStatus">Status</Label>
            <Select
              id="taskStatus"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            {error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                {success}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={loading || projects.length === 0} className="w-full">
              {loading ? "Creating..." : "Create task"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function BroadcastForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    audience: "ALL",
    kind: "ANNOUNCEMENT"
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          audience: form.audience,
          kind: form.kind
        })
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not send notification");
      }

      setSuccess("Notification sent to the workspace");
      setForm({
        title: "",
        message: "",
        audience: "ALL",
        kind: "ANNOUNCEMENT"
      });
      router.refresh();
    } catch (broadcastError) {
      setError(broadcastError instanceof Error ? broadcastError.message : "Could not send notification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Admin broadcast
        </Badge>
        <CardTitle>Send a notification</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="notificationTitle">Title</Label>
            <Input
              id="notificationTitle"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Daily standup reminder"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notificationMessage">Message</Label>
            <Textarea
              id="notificationMessage"
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Please start your timer before the 9:30 AM check-in."
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Select
                id="audience"
                value={form.audience}
                onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}
              >
                <option value="ALL">All employees</option>
                <option value="ADMINS">Admins only</option>
                <option value="EMPLOYEES">Employees only</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kind">Kind</Label>
              <Select
                id="kind"
                value={form.kind}
                onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}
              >
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="REQUEST">Request</option>
              </Select>
            </div>
          </div>
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
              {success}
            </div>
          ) : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Broadcast notification"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AssignWorkForm({ employees, tasks }: { employees: MemberOption[]; tasks: TaskOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: employees[0]?.id ?? "",
    taskId: tasks[0]?.id ?? ""
  });

  useEffect(() => {
    if (employees.length > 0 && !employees.some((employee) => employee.id === form.employeeId)) {
      setForm((current) => ({ ...current, employeeId: employees[0].id }));
    }
  }, [employees, form.employeeId]);

  useEffect(() => {
    if (tasks.length > 0 && !tasks.some((task) => task.id === form.taskId)) {
      setForm((current) => ({ ...current, taskId: tasks[0].id }));
    }
  }, [tasks, form.taskId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (tasks.length === 0) {
      setError("Create a task first, then assign it to an employee.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        employeeId: form.employeeId.trim(),
        taskId: form.taskId.trim()
      };

      const response = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not assign task");
      }

      setSuccess(`${data.employee.fullName} assigned to ${data.task.title}`);
      router.refresh();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Could not assign task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Work assignment
        </Badge>
        <CardTitle>Assign a task to an employee</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee</Label>
            <Select
              id="employeeId"
              value={form.employeeId}
              onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
              disabled={employees.length === 0}
            >
              {employees.length === 0 ? <option value="">No employee available</option> : null}
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.githubUsername ? ` @${employee.githubUsername}` : ""}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Pick a person from the workspace list instead of typing an email.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskId">Task</Label>
            <Select
              id="taskId"
              value={form.taskId}
              onChange={(event) => setForm((current) => ({ ...current, taskId: event.target.value }))}
              disabled={tasks.length === 0}
            >
              {tasks.length === 0 ? <option value="">No task available</option> : null}
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.projectName} - {task.title}
                </option>
              ))}
            </Select>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Create a task in Projects first. Once a task exists, you can assign it here.
              </p>
            ) : null}
          </div>
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
              {success}
            </div>
          ) : null}
          <Button type="submit" disabled={loading || tasks.length === 0 || employees.length === 0} className="w-full">
            {loading ? "Assigning..." : "Assign task"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
