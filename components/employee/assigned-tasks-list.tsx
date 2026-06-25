"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

type AssignedTask = {
  id: string;
  title: string;
  projectName: string;
  status: string;
};

export function AssignedTasksList({ tasks }: { tasks: AssignedTask[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function updateTaskStatus(taskId: string, newStatus: string) {
    setLoadingId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setLoadingId(null);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    if (newStatus === "REVIEW") {
      const w1 = window.confirm("Warning 1: Are you sure your task is fully completed and ready for testing?");
      if (!w1) return;
      const w2 = window.confirm("Warning 2: Have you double-checked all requirements? Once submitted, you cannot edit the status!");
      if (!w2) return;
      const w3 = window.confirm("Warning 3: Final confirmation! Submitting this to the Tester will lock the task. Proceed?");
      if (!w3) return;
    }
    await updateTaskStatus(taskId, newStatus);
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Assigned tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No tasks have been assigned to you yet.
          </div>
        ) : null}
        {tasks.map((task) => (
          <div key={task.id} className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{task.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{task.projectName}</p>
              </div>
              <div className="flex items-center gap-3">
                {task.status !== "DONE" && task.status !== "REVIEW" ? (
                  <Select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    disabled={loadingId === task.id}
                    className="w-[140px] h-9"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">Testing/Review</option>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className={task.status === "REVIEW" ? "bg-amber-500 hover:bg-amber-600" : ""}>
                      {task.status === "REVIEW" ? "In Testing" : task.status}
                    </Badge>
                    {task.status === "DONE" && <span className="text-xs text-emerald-600 font-medium">✓ Completed</span>}
                    {task.status === "REVIEW" && <span className="text-xs text-amber-600 font-medium">Pending Tester Approval</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
