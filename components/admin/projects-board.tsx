"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type TeamOption = {
  id: string;
  name: string;
};

type ProjectItem = {
  id: string;
  name: string;
  status: string;
  teamId: string | null;
  team: TeamOption | null;
};

type ProjectsBoardProps = {
  initialProjects: ProjectItem[];
  teams: TeamOption[];
};

export function ProjectsBoard({ initialProjects, teams }: ProjectsBoardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync state if props update
  if (JSON.stringify(projects.map(p => p.teamId)) !== JSON.stringify(initialProjects.map(p => p.teamId))) {
    setProjects(initialProjects);
  }

  async function handleTeamChange(projectId: string, newTeamId: string) {
    setUpdatingProjectId(projectId);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teamId: newTeamId || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update project team");
      }

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, teamId: data.project.teamId, team: teams.find((t) => t.id === data.project.teamId) ?? null }
            : p
        )
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign team to project");
    } finally {
      setUpdatingProjectId(null);
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success";
      case "ON_HOLD": return "warning";
      case "COMPLETED": return "secondary";
      default: return "default";
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Project Team Assignment</span>
          {updatingProjectId && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Assign projects to specific teams so their team leads can create and assign tasks.
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Team</TableHead>
              <TableHead className="w-[200px]">Change Team</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                  No projects created yet. Use the project form above to create one.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(project.status)} className="scale-90 select-none">
                      {project.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.team ? (
                      <Badge variant="success">{project.team.name}</Badge>
                    ) : (
                      <Badge variant="secondary">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <Select
                      value={project.teamId ?? ""}
                      onChange={(e) => handleTeamChange(project.id, e.target.value)}
                      disabled={updatingProjectId === project.id}
                      className="h-8 py-1 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
