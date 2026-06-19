"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AssignedTask = {
  id: string;
  title: string;
  projectName: string;
  status: string;
};

export function AssignedTasksList({ tasks }: { tasks: AssignedTask[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function markAsDone(taskId: string) {
    setLoadingId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" })
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
                <Badge variant={task.status === "DONE" ? "default" : "secondary"}>
                  {task.status}
                </Badge>
                {task.status !== "DONE" ? (
                  <Button
                    size="sm"
                    disabled={loadingId === task.id}
                    onClick={() => markAsDone(task.id)}
                  >
                    {loadingId === task.id ? "Updating..." : "Mark as Done"}
                  </Button>
                ) : (
                  <span className="text-xs text-emerald-600 font-medium">✓ Completed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
