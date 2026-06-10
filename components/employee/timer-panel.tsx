"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ProjectOption = {
  id: string;
  name: string;
};

type TaskOption = {
  id: string;
  title: string;
  projectId: string;
};

type TimeEntry = {
  id: string;
  status: "RUNNING" | "PAUSED" | "STOPPED";
  startedAt: string;
  updatedAt: string;
  totalSeconds: number;
  productiveSeconds: number;
  idleSeconds: number;
  projectId: string | null;
  taskId: string | null;
  note: string | null;
};

type TimerPanelProps = {
  userId: string;
  organizationId: string;
  teamId?: string | null;
  consentStatus: "PENDING" | "ACCEPTED" | "REVOKED";
  projects: ProjectOption[];
  tasks: TaskOption[];
  initialEntry: TimeEntry | null;
};

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const rest = (safe % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${rest}`;
}

export function TimerPanel({
  userId,
  organizationId,
  teamId,
  consentStatus,
  projects,
  tasks,
  initialEntry
}: TimerPanelProps) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(initialEntry);
  const [projectId, setProjectId] = useState(initialEntry?.projectId ?? tasks[0]?.projectId ?? projects[0]?.id ?? "");
  const [taskId, setTaskId] = useState(initialEntry?.taskId ?? "");
  const [note, setNote] = useState(initialEntry?.note ?? "");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canTrack = consentStatus === "ACCEPTED";

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const selectedProjectTasks = tasks.filter((task) => task.projectId === projectId);
    if (selectedProjectTasks.length > 0 && !selectedProjectTasks.some((task) => task.id === taskId)) {
      setTaskId(selectedProjectTasks[0].id);
    }
  }, [projectId, taskId, tasks]);

  useEffect(() => {
    if (currentEntry) {
      setProjectId(currentEntry.projectId ?? tasks[0]?.projectId ?? projects[0]?.id ?? "");
      setTaskId(currentEntry.taskId ?? "");
      setNote(currentEntry.note ?? "");
    }
  }, [currentEntry, projects, tasks]);

  useEffect(() => {
    setCurrentEntry(initialEntry);
  }, [initialEntry?.id, initialEntry?.status, initialEntry?.startedAt, initialEntry?.updatedAt, initialEntry?.totalSeconds, initialEntry?.productiveSeconds, initialEntry?.idleSeconds, initialEntry?.projectId, initialEntry?.taskId, initialEntry?.note]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => !projectId || task.projectId === projectId),
    [projectId, tasks]
  );

  const activeSeconds = useMemo(() => {
    if (!currentEntry) return 0;
    if (currentEntry.status === "PAUSED" || currentEntry.status === "STOPPED") {
      return currentEntry.totalSeconds;
    }
    if (!mounted || !now) {
      return currentEntry.totalSeconds;
    }
    const referenceMs = new Date(currentEntry.updatedAt).getTime();
    const activeElapsedMs = Math.max(0, now - referenceMs);
    return currentEntry.totalSeconds + Math.floor(activeElapsedMs / 1000);
  }, [currentEntry, mounted, now]);

  async function sendAction(action: "START" | "STOP" | "PAUSE" | "RESUME") {
    if ((action === "START" || action === "RESUME") && !canTrack) {
      setError("Tracking permission is required before you can start or resume time.");
      return;
    }

    setLoadingAction(action);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          organizationId,
          teamId: teamId ?? undefined,
          projectId: projectId || undefined,
          taskId: taskId || undefined,
          action,
          note,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update timer");
      }

      setCurrentEntry(data.entry);
      setMessage(
        action === "START"
          ? "Timer started."
          : action === "PAUSE"
            ? "Timer paused."
            : action === "RESUME"
              ? "Timer resumed."
              : "Timer stopped."
      );
      router.refresh();
    } catch (timerError) {
      setError(timerError instanceof Error ? timerError.message : "Could not update timer");
    } finally {
      setLoadingAction(null);
    }
  }

  const isRunning = currentEntry?.status === "RUNNING";
  const isPaused = currentEntry?.status === "PAUSED";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-border/70 bg-gradient-to-br from-sky-500/10 to-emerald-500/10">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="secondary" className="w-fit">
              Your workspace timer
            </Badge>
            <Badge className={cn("w-fit", isRunning ? "bg-emerald-500" : isPaused ? "bg-amber-500" : "")}>
              {currentEntry?.status ?? "STOPPED"}
            </Badge>
          </div>
          {!canTrack ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
              Tracking is locked until you allow screenshots during work time. Please approve monitoring above before starting your timer.
            </div>
          ) : null}
          <CardTitle className="text-3xl md:text-4xl" suppressHydrationWarning>
            {formatClock(activeSeconds)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectId">Active project</Label>
              <Select id="projectId" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">No project selected</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskId">Active task</Label>
              <Select id="taskId" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
                <option value="">No task selected</option>
                {filteredTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Work note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What are you working on right now?"
              rows={4}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {!currentEntry || currentEntry.status === "STOPPED" ? (
              <Button onClick={() => sendAction("START")} disabled={loadingAction !== null || !canTrack}>
                <Play className="h-4 w-4" />
                {loadingAction === "START" ? "Starting..." : "Start timer"}
              </Button>
            ) : null}
            {isRunning ? (
              <Button variant="outline" onClick={() => sendAction("PAUSE")} disabled={loadingAction !== null}>
                <Pause className="h-4 w-4" />
                {loadingAction === "PAUSE" ? "Pausing..." : "Pause"}
              </Button>
            ) : null}
            {isPaused ? (
              <Button variant="outline" onClick={() => sendAction("RESUME")} disabled={loadingAction !== null || !canTrack}>
                <RotateCcw className="h-4 w-4" />
                {loadingAction === "RESUME" ? "Resuming..." : "Resume"}
              </Button>
            ) : null}
            {currentEntry && currentEntry.status !== "STOPPED" ? (
              <Button variant="secondary" onClick={() => sendAction("STOP")} disabled={loadingAction !== null}>
                <Square className="h-4 w-4" />
                {loadingAction === "STOP" ? "Stopping..." : "Stop"}
              </Button>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
              {message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Live totals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Current session</p>
              <p className="mt-2 text-2xl font-semibold" suppressHydrationWarning>
                {formatClock(activeSeconds)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Productive minutes</p>
              <p className="mt-2 text-2xl font-semibold">{Math.max(0, Math.round((currentEntry?.productiveSeconds ?? 0) / 60))}m</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Idle minutes</p>
              <p className="mt-2 text-2xl font-semibold">{Math.max(0, Math.round((currentEntry?.idleSeconds ?? 0) / 60))}m</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm text-muted-foreground">Selected task</p>
              <p className="mt-2 text-base font-semibold leading-6">
                {filteredTasks.find((task) => task.id === taskId)?.title ?? "No task selected"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
