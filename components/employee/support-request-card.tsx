"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarField } from "@/components/employee/calendar-field";

type SupportRequestCardProps = {
  title?: string;
  description?: string;
  placeholder?: string;
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
};

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return { error: text };
  }
}

export function SupportRequestCard({
  title = "Need help?",
  description = "Send a request to your admin if you missed a timer or need work clarification.",
  placeholder = "Describe why the time needs to be added.",
  projects,
  defaultProjectId = ""
}: SupportRequestCardProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toDate, setToDate] = useState("");
  const [toTime, setToTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toIso(dateValue: string, timeValue: string) {
    return new Date(`${dateValue}T${timeValue}`).toISOString();
  }

  async function submitRequest() {
    if (!projectId || !fromDate || !fromTime || !toDate || !toTime || !reason.trim()) {
      setError("Please choose a project, from/to dates, times, and a reason.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId,
          requestStartAt: toIso(fromDate, fromTime),
          requestEndAt: toIso(toDate, toTime),
          reason: reason.trim()
        })
      });

      const data = (await readJsonResponse(response)) ?? {};
      if (!response.ok) {
        throw new Error(data.error ?? "Could not send request");
      }

      setFromDate("");
      setFromTime("");
      setToDate("");
      setToTime("");
      setReason("");
      setSuccess("Request sent to admins. If approved, the time will be added automatically.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-background/50 p-4">
            <p className="text-sm font-medium">From</p>
            <CalendarField label="Date" selectedDate={fromDate} onChange={setFromDate} />
            <div className="space-y-2">
              <Label htmlFor="fromTime">Time</Label>
              <Input id="fromTime" type="time" value={fromTime} onChange={(event) => setFromTime(event.target.value)} />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-background/50 p-4">
            <p className="text-sm font-medium">To</p>
            <CalendarField label="Date" selectedDate={toDate} onChange={setToDate} />
            <div className="space-y-2">
              <Label htmlFor="toTime">Time</Label>
              <Input id="toTime" type="time" value={toTime} onChange={(event) => setToTime(event.target.value)} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select id="projectId" value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={projects.length === 0}>
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground">No projects are available yet. Ask an admin to assign one first.</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={placeholder}
            rows={5}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          If the admin approves, the selected time range will be added to your work time automatically.
        </p>
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
            {success}
          </div>
        ) : null}
        <Button className="w-full" variant="outline" onClick={submitRequest} disabled={loading}>
          <Send className="h-4 w-4" />
          {loading ? "Sending..." : "Send request to admin"}
        </Button>
      </CardContent>
    </Card>
  );
}
