"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, Github, FileText, Eye } from "lucide-react";

export type TestableTask = {
  id: string;
  title: string;
  projectName: string | null;
  assigneeName: string | null;
  workDetails?: string | null;
  githubLink?: string | null;
  description?: string | null;
};

export function TesterQueue({ tasks: initialTasks }: { tasks: TestableTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingTask, setViewingTask] = useState<TestableTask | null>(null);
  const [rejectingTask, setRejectingTask] = useState<TestableTask | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const router = useRouter();

  async function handleAction(taskId: string, action: "approve" | "reject", additionalData: any = {}) {
    setProcessingId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...additionalData })
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

  async function submitRejection() {
    if (!rejectingTask) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejecting the task.");
      return;
    }
    await handleAction(rejectingTask.id, "reject", { rejectionReason });
    setRejectingTask(null);
    setViewingTask(null);
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-border/70 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary">Tasks Ready for Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/50 p-4 shadow-sm transition-all hover:bg-background/80">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {task.projectName ?? "No project"} • Assigned to <span className="font-medium text-foreground">{task.assigneeName ?? "Unknown"}</span>
                  </p>
                </div>
                
                <Button
                  size="sm"
                  variant="secondary"
                  className="font-medium h-9"
                  onClick={() => setViewingTask(task)}
                >
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                  View Request
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Request Modal */}
      {viewingTask && !rejectingTask && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold mb-1">Review Task</h2>
              <p className="text-sm text-muted-foreground mb-6">Review the details submitted by the intern.</p>
              
              <div className="space-y-5">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Task</Label>
                  <p className="font-medium text-foreground text-sm">{viewingTask.title}</p>
                </div>

                {viewingTask.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Task Description</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingTask.description}</p>
                  </div>
                )}
                
                {(viewingTask.workDetails || viewingTask.githubLink) && (
                  <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4 text-sm">
                    {viewingTask.workDetails && (
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground block mb-1">What they fixed:</span>
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{viewingTask.workDetails}</p>
                        </div>
                      </div>
                    )}
                    
                    {viewingTask.githubLink && (
                      <div className="flex items-start gap-2.5 pt-3 border-t border-border/50">
                        <Github className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground block mb-1">GitHub Link:</span>
                          <a href={viewingTask.githubLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all block">
                            {viewingTask.githubLink}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-muted/30 border-t border-border p-4 flex items-center justify-between gap-3 mt-auto">
              <Button variant="ghost" size="sm" onClick={() => setViewingTask(null)} disabled={processingId === viewingTask.id}>Close</Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setRejectingTask(viewingTask);
                    setRejectionReason("");
                  }}
                  disabled={processingId === viewingTask.id}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={async () => {
                    await handleAction(viewingTask.id, "approve");
                    setViewingTask(null);
                  }}
                  disabled={processingId === viewingTask.id}
                >
                  {processingId === viewingTask.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                  Approve
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingTask && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-1">
                <X className="h-5 w-5" />
                Reject Task
              </h2>
              <p className="text-sm text-muted-foreground mb-6">Return this task to the intern for revisions.</p>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Task</Label>
                  <div className="bg-muted/50 border border-border/50 rounded-md p-3 text-sm font-medium">
                    {rejectingTask.title}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason" className="text-destructive font-medium">Why is this being rejected? *</Label>
                  <Textarea 
                    id="rejectionReason"
                    placeholder="Provide specific feedback on what needs to be fixed..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="h-24 resize-none border-destructive/30 focus-visible:ring-destructive/50"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-muted/30 border-t border-border p-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectingTask(null)} disabled={processingId === rejectingTask.id}>Back</Button>
              <Button variant="destructive" onClick={submitRejection} disabled={processingId === rejectingTask.id || !rejectionReason.trim()}>
                {processingId === rejectingTask.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
