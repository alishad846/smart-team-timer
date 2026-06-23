"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Check, AlertTriangle } from "lucide-react";

type ProjectOption = {
  id: string;
  name: string;
  teamId: string | null;
};

type UserOption = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

type TeamMemberOption = {
  id: string;
  userId: string;
  role: string;
  user: UserOption;
};

type TeamOption = {
  id: string;
  name: string;
  leaderId: string | null;
  members: TeamMemberOption[];
};

type TeamLeadTaskFormProps = {
  projects: ProjectOption[];
  teams: TeamOption[];
};

export function TeamLeadTaskForm({ projects, teams }: TeamLeadTaskFormProps) {
  const router = useRouter();
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  // Get all members from all teams that this lead manages (without duplicates)
  const allTeammates = Array.from(
    new Map(
      teams
        .flatMap((t) => t.members)
        .filter((m) => m.user)
        .map((m) => [m.userId, m])
    ).values()
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    if (!title.trim()) {
      setError("Please provide a task title.");
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
          projectId,
          assigneeId: assigneeId || undefined,
          title: title.trim(),
          description: description.trim(),
          priority,
          status: "TODO"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create task");
      }

      setSuccess(`Task "${data.task.title}" created and assigned successfully.`);
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setPriority("MEDIUM");
      
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
      <CardHeader className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Team Lead Action
        </Badge>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <PlusCircle className="h-5 w-5 text-purple-500" />
          Create & Assign Team Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            No projects have been assigned to your team by the admin yet. Ask the admin to link a project to your team.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-project">Active Project</Label>
                <Select
                  id="task-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                >
                  {projects.map((p) => {
                    const linkedTeam = teams.find((t) => t.id === p.teamId);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {linkedTeam ? `(${linkedTeam.name})` : ""}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-assignee">Assign Teammate (Optional)</Label>
                <Select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">No assignee (Unassigned)</option>
                  {allTeammates.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.fullName} ({teams.some((t) => t.leaderId === m.userId) ? "team lead" : m.role.toLowerCase()})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Review code architecture, implement login..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-desc">Task Description</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scope, guidelines, and delivery criteria..."
                rows={3}
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                {success}
              </div>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 border-0 shadow-md">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Task...
                </>
              ) : (
                "Create & Assign Task"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
