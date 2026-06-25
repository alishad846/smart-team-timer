"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";

type AssignedTask = {
  id: string;
  title: string;
  projectName: string;
  status: string;
  description?: string | null;
  rejectionReason?: string | null;
};

export function AssignedTasksList({ tasks }: { tasks: AssignedTask[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState<AssignedTask | null>(null);
  const [workDetails, setWorkDetails] = useState("");
  const [githubLink, setGithubLink] = useState("");

  async function updateTaskStatus(taskId: string, newStatus: string, additionalData: any = {}) {
    setLoadingId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...additionalData })
      });
      if (response.ok) {
        if (newStatus === "REVIEW") {
          alert("Sent to Tester successfully!");
        }
        router.refresh();
      } else {
        alert("Failed to update task status. Make sure you restarted your dev server!");
      }
    } catch {
      alert("A network error occurred while updating the task status.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    await updateTaskStatus(taskId, newStatus);
  }

  async function submitForReview() {
    if (!submittingTask) return;
    if (!workDetails.trim()) {
      alert("Please describe what you fixed or worked on.");
      return;
    }
    
    await updateTaskStatus(submittingTask.id, "REVIEW", {
      workDetails,
      githubLink
    });
    setSubmittingTask(null);
  }

  return (
    <>
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
                  {task.rejectionReason && task.status !== "REVIEW" && task.status !== "DONE" && (
                    <div className="mt-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2 rounded-md flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-xs uppercase tracking-wider mb-0.5">Rejected by Tester</p>
                        <p>{task.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {task.status !== "DONE" && task.status !== "REVIEW" ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        disabled={loadingId === task.id}
                        className="w-[130px] h-9"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                      </Select>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 font-medium"
                        disabled={task.status !== "IN_PROGRESS" || loadingId === task.id}
                        onClick={() => {
                          setSubmittingTask(task);
                          setWorkDetails("");
                          setGithubLink("");
                        }}
                      >
                        Submit for Testing
                      </Button>
                    </div>
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

      {submittingTask && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-1">Submit for Testing</h2>
              <p className="text-sm text-muted-foreground mb-6">Provide details for the tester reviewing your work.</p>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Task</Label>
                  <div className="bg-muted/50 border border-border/50 rounded-md p-3 text-sm font-medium">
                    {submittingTask.title}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="workDetails">What did you fix/work on? *</Label>
                  <Textarea 
                    id="workDetails"
                    placeholder="Briefly describe the implementation..."
                    value={workDetails}
                    onChange={(e) => setWorkDetails(e.target.value)}
                    className="h-24 resize-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="githubLink">GitHub PR / Commit Link</Label>
                  <Input 
                    id="githubLink"
                    placeholder="https://github.com/..."
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-muted/30 border-t border-border p-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSubmittingTask(null)} disabled={loadingId === submittingTask.id}>Cancel</Button>
              <Button onClick={submitForReview} disabled={loadingId === submittingTask.id || !workDetails.trim()}>
                {loadingId === submittingTask.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit to Tester
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
