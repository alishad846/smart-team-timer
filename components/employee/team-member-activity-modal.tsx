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
                          <div key={task.id} className="group relative rounded-xl bg-gradient-to-br from-card to-muted/20 border border-border/60 p-4 text-sm shadow-sm transition-all duration-300 hover:shadow-md hover:border-border hover:-translate-y-0.5">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex flex-col gap-1.5 pr-2">
                                <p className="font-semibold text-foreground pr-2 group-hover:text-primary transition-colors">{task.title}</p>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider w-fit ${task.status === "REVIEW" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
                                  {task.status === "REVIEW" ? "TESTING" : task.status.replace("_", " ")}
                                </span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={deletingId === task.id}
                              >
                                {deletingId === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                            {task.description && (
                              <p className="text-muted-foreground text-xs leading-relaxed mt-2.5 whitespace-pre-wrap">{task.description}</p>
                            )}
                            {task.project && (
                              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                <p className="text-[10px] text-muted-foreground font-medium">
                                  {task.project.name}
                                </p>
                              </div>
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
                          <div key={task.id} className="group rounded-xl bg-gradient-to-br from-emerald-500/[0.03] to-emerald-500/[0.01] border border-emerald-500/20 p-4 text-sm opacity-70 transition-all duration-300 hover:opacity-100 hover:shadow-sm hover:border-emerald-500/30">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex flex-col gap-1.5 pr-2">
                                <p className="font-medium pr-2 line-through text-muted-foreground group-hover:text-foreground transition-colors">{task.title}</p>
                                <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">
                                  COMPLETED
                                </span>
                              </div>
                            </div>
                            {task.project && (
                              <div className="mt-3 pt-3 border-t border-emerald-500/10 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                <p className="text-[10px] text-muted-foreground font-medium">
                                  {task.project.name}
                                </p>
                              </div>
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
