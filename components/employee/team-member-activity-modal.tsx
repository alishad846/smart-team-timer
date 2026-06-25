"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Trash2, Loader2 } from "lucide-react";

export function TeamMemberActivityModal({ latestLog, tasks: initialTasks = [] }: { latestLog: any, tasks?: any[] }) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDeleteTask(taskId: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    setDeletingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete task");
      }
    } catch (err) {
      alert("Failed to delete task");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Activity
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-lg border border-border">
            <button 
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            
            <h2 className="text-lg font-semibold tracking-tight mb-4">Recent Activity Details</h2>
            
            <div className="space-y-6">
              {/* Activity Section */}
              <div className="space-y-4">
                {latestLog ? (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Inputs (Last 10 minutes)</h4>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex justify-between border-b border-border/50 pb-1">
                          <span className="text-muted-foreground">Keyboard Usage:</span>
                          <span className="font-medium">{latestLog.keyboardPercent}%</span>
                        </div>
                        <div className="flex justify-between border-b border-border/50 pb-1">
                          <span className="text-muted-foreground">Mouse Usage:</span>
                          <span className="font-medium">{latestLog.mousePercent}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Active Window</h4>
                      <div className="rounded-md bg-muted/50 p-3 text-sm border border-border/50">
                        <p className="font-medium text-primary">{latestLog.activeApp}</p>
                        {latestLog.activeWindow && (
                          <p className="text-muted-foreground mt-1 text-xs break-words">{latestLog.activeWindow}</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm py-2">No recent activity data available.</p>
                )}
              </div>

              {/* Tasks Section */}
              <div className="border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* In Progress Column */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">In Progress</h4>
                    {tasks.filter(t => t.status !== "DONE").length > 0 ? (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                        {tasks.filter(t => t.status !== "DONE").map(task => (
                          <div key={task.id} className="rounded-md bg-card border border-border p-3 text-sm">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex flex-col gap-1 pr-2">
                                <p className="font-medium pr-2">{task.title}</p>
                                <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">{task.status === "REVIEW" ? "TESTING" : task.status.replace("_", " ")}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={deletingId === task.id}
                              >
                                {deletingId === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </div>
                            {task.description && (
                              <p className="text-muted-foreground text-xs mt-1.5 line-clamp-3">{task.description}</p>
                            )}
                            {task.project && (
                              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                                Project: <span className="font-medium">{task.project.name}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">No active tasks.</p>
                    )}
                  </div>

                  {/* Completed Column */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">Completed</h4>
                    {tasks.filter(t => t.status === "DONE").length > 0 ? (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                        {tasks.filter(t => t.status === "DONE").map(task => (
                          <div key={task.id} className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-3 text-sm opacity-80">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex flex-col gap-1 pr-2">
                                <p className="font-medium pr-2 line-through text-muted-foreground">{task.title}</p>
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">COMPLETED</span>
                              </div>
                            </div>
                            {task.project && (
                              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                                Project: <span className="font-medium">{task.project.name}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">No completed tasks.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
