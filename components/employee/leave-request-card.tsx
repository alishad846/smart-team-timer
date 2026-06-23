"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarField } from "@/components/employee/calendar-field";

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

type LeaveRequestCardProps = {
  title?: string;
  description?: string;
  projects?: { id: string; name: string }[];
  teamLeads?: { id: string; fullName: string }[];
  teamName?: string;
};

export function LeaveRequestCard({
  title = "Plan leave",
  description = "Pick the start and end date for your leave request and explain the reason.",
  projects = [],
  teamLeads = [],
  teamName = "Unassigned"
}: LeaveRequestCardProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [reason, setReason] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitRequest() {
    if (!startDate || !endDate || !reason.trim()) {
      setError("Please choose a start date, end date, and a reason.");
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
          startDate,
          endDate,
          projectId: projectId || undefined,
          teamLeadId: teamLeadId || undefined,
          reason: reason.trim(),
          documentUrl: documentUrl?.trim() || undefined
        })
      });

      const data = (await readJsonResponse(response)) ?? {};
      if (!response.ok) {
        throw new Error(data.error ?? "Could not send leave request");
      }

      setStartDate("");
      setEndDate("");
      setReason("");
      setSuccess("Leave request sent to admins. You will get an update when it is approved or rejected.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send leave request");
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
            <p className="text-sm font-medium">Start</p>
            <CalendarField label="Date" selectedDate={startDate} onChange={setStartDate} />
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-background/50 p-4">
            <p className="text-sm font-medium">End</p>
            <CalendarField label="Date" selectedDate={endDate} onChange={setEndDate} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-reason">Reason</Label>
          <Textarea
            id="leave-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Example: Family event, medical appointment, or personal work."
            rows={5}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-team">Assigned Team</Label>
          <input
            id="leave-team"
            className="w-full rounded-md border border-border/60 bg-muted/50 px-3 py-2 text-sm cursor-not-allowed text-muted-foreground"
            value={teamName}
            disabled
            readOnly
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-project">Project (optional)</Label>
          <select
            id="leave-project"
            className="w-full rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-teamlead">Team lead (optional)</Label>
          <select
            id="leave-teamlead"
            className="w-full rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
            value={teamLeadId}
            onChange={(e) => setTeamLeadId(e.target.value)}
          >
            <option value="">No lead</option>
            {teamLeads.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-document">Document (optional URL)</Label>
          <input
            id="leave-document"
            className="w-full rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
            placeholder="https://example.com/medical-note.pdf"
          />
          <div className="mt-2 flex items-center gap-3">
            <input
              id="leave-file"
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const form = new FormData();
                  form.append("file", file);
                  const res = await fetch("/api/uploads", { method: "POST", body: form });
                  const json = await res.json();
                  if (res.ok && json.url) {
                    setDocumentUrl(json.url);
                  } else {
                    setError(json.error ?? "Upload failed");
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setUploading(false);
                }
              }}
            />
            {uploading ? <span className="text-sm text-muted-foreground">Uploading...</span> : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Once an admin approves the request, you will receive a notification in your inbox.
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
          {loading ? "Sending..." : "Send leave request"}
        </Button>
      </CardContent>
    </Card>
  );
}
