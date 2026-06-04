"use client";

import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

function CalendarField({
  label,
  selectedDate,
  onChange
}: {
  label: string;
  selectedDate: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const initial = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
    return startOfMonth(initial);
  });

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfWeek(addMonths(monthStart, 1), { weekStartsOn: 1 });
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: monthEnd });
    const rows: Date[][] = [];

    for (let index = 0; index < days.length; index += 7) {
      rows.push(days.slice(index, index + 7));
    }

    return rows;
  }, [cursor]);

  const selected = selectedDate ? new Date(`${selectedDate}T12:00:00`) : null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2 text-left font-normal"
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarDays className="h-4 w-4" />
        <span>{selected ? format(selected, "EEE, MMM d, yyyy") : "Pick a date"}</span>
      </Button>
      {open ? (
        <div className="rounded-2xl border border-border bg-background p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setCursor((current) => subMonths(current, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-medium">{format(cursor, "MMMM yyyy")}</p>
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setCursor((current) => addMonths(current, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {["M", "T", "W", "T", "F", "S", "S"].map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const inMonth = isSameMonth(day, cursor);
                  const isSelected = selected ? isSameDay(day, selected) : false;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={`rounded-xl border px-0 py-2 text-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : inMonth
                            ? "border-border bg-muted/20 hover:bg-muted/50"
                            : "border-transparent text-muted-foreground/40"
                      }`}
                      onClick={() => {
                        onChange(format(day, "yyyy-MM-dd"));
                        setOpen(false);
                      }}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
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
