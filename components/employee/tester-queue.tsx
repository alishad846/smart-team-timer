"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Loader2 } from "lucide-react";

export type TestableTask = {
  id: string;
  title: string;
  projectName: string | null;
  assigneeName: string | null;
};

export function TesterQueue({ tasks: initialTasks }: { tasks: TestableTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleAction(taskId: string, action: "approve" | "reject") {
    setProcessingId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${action} task`);
      }
    } catch (err) {
      alert(`Failed to ${action} task`);
    } finally {
      setProcessingId(null);
    }
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/70 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-primary">Tasks Ready for Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/50 p-4 shadow-sm transition-all hover:bg-background/80">
              <div>
                <p className="font-semibold">{task.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {task.projectName ?? "No project"} • Assigned to {task.assigneeName ?? "Unknown"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleAction(task.id, "reject")}
                  disabled={processingId === task.id}
                >
                  {processingId === task.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <X className="mr-2 h-3 w-3" />}
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => handleAction(task.id, "approve")}
                  disabled={processingId === task.id}
                >
                  {processingId === task.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Check className="mr-2 h-3 w-3" />}
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
