"use client";

import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";

type TimelineEntry = {
  id?: string;
  startedAt: Date;
  endedAt: Date | null;
  status: "RUNNING" | "PAUSED" | "STOPPED";
  totalSeconds: number;
  productiveSeconds?: number;
  idleSeconds?: number;
  project?: { name: string } | null;
  task?: { title: string } | null;
};

type ActivityTimelineProps = {
  entries: TimelineEntry[];
  title?: string;
  subtitle?: string;
};

type WindowRange = {
  start: Date;
  end: Date;
  label: string;
};

function clampToDay(range: WindowRange, dayStart: Date, dayEnd: Date) {
  const start = new Date(Math.max(range.start.getTime(), dayStart.getTime()));
  const end = new Date(Math.min(range.end.getTime(), dayEnd.getTime()));
  if (end <= start) {
    return null;
  }
  return { start, end, label: range.label };
}

function mergeWindows(windows: WindowRange[]) {
  return windows
    .sort((left, right) => left.start.getTime() - right.start.getTime())
    .reduce<WindowRange[]>((acc, window) => {
      const last = acc[acc.length - 1];
      if (!last || window.start.getTime() > last.end.getTime()) {
        acc.push(window);
        return acc;
      }

      last.end = new Date(Math.max(last.end.getTime(), window.end.getTime()));
      last.label = `${format(last.start, "HH:mm")} - ${format(last.end, "HH:mm")}`;
      return acc;
    }, []);
}

export function ActivityTimeline({
  entries,
  title = "Today's 24-hour line",
  subtitle = "Hover the line to see exact active windows."
}: ActivityTimelineProps) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const windows = mergeWindows(
    entries
      .map((entry) => {
        const start = new Date(entry.startedAt);
        const end =
          entry.status === "RUNNING"
            ? new Date()
            : entry.endedAt
              ? new Date(entry.endedAt)
              : new Date(start.getTime() + Math.max(0, entry.totalSeconds) * 1000);

        return clampToDay(
          {
            start,
            end,
            label: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`
          },
          dayStart,
          dayEnd
        );
      })
      .filter(Boolean) as WindowRange[]
  );

  const totalActiveMinutes = windows.reduce((sum, window) => sum + (window.end.getTime() - window.start.getTime()) / 60000, 0);

  const hourMarks = Array.from({ length: 24 }, (_, hour) => {
    const hourStart = new Date(dayStart);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hour + 1, 0, 0, 0);

    const activeMinutes = windows.reduce((sum, window) => {
      const overlapStart = Math.max(window.start.getTime(), hourStart.getTime());
      const overlapEnd = Math.min(window.end.getTime(), hourEnd.getTime());
      if (overlapEnd <= overlapStart) {
        return sum;
      }
      return sum + (overlapEnd - overlapStart) / 60000;
    }, 0);

    return {
      label: `${String(hour).padStart(2, "0")}:00`,
      activeMinutes
    };
  });

  const bars = windows.map((window, index) => {
    const startMinutes = (window.start.getTime() - dayStart.getTime()) / 60000;
    const durationMinutes = (window.end.getTime() - window.start.getTime()) / 60000;
    const left = (startMinutes / (24 * 60)) * 100;
    const width = (durationMinutes / (24 * 60)) * 100;
    return {
      id: `${window.start.toISOString()}-${index}`,
      left,
      width,
      label: window.label
    };
  });

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          <div className="rounded-3xl border border-border bg-background/70 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{format(dayStart, "EEE, MMM d, yyyy")}</p>
                <p className="mt-1 text-lg font-semibold">24-hour activity line</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hover the green bars to see the exact active time range.
                </p>
              </div>
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700">
                {formatDuration(Math.max(0, Math.round(totalActiveMinutes)))}
                <span className="ml-2 text-emerald-700/70">active today</span>
              </div>
            </div>

            <div className="grid grid-cols-6 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <span>00</span>
              <span className="text-center">04</span>
              <span className="text-center">08</span>
              <span className="text-center">12</span>
              <span className="text-center">16</span>
              <span className="text-right">24</span>
            </div>

            <div className="relative mt-4 h-14">
              <div className="grid h-full gap-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {hourMarks.map((hour) => {
                  const ratio = Math.min(1, hour.activeMinutes / 60);
                  const active = hour.activeMinutes > 0;
                  return (
                    <div
                      key={hour.label}
                      className={cn(
                        "h-14 rounded-md border transition-colors",
                        active ? "border-emerald-500/40 bg-emerald-500/15" : "border-border bg-muted/30"
                      )}
                      style={{ opacity: active ? 0.25 + ratio * 0.65 : 1 }}
                      title={`${hour.label} - ${Math.round(hour.activeMinutes)} active minutes`}
                    />
                  );
                })}
              </div>

              {bars.map((bar) => (
                <div
                  key={bar.id}
                  className="absolute top-0 h-14 rounded-md border border-emerald-400/30 bg-emerald-500/75 shadow-[0_0_0_1px_rgba(16,185,129,0.15)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_0_18px_rgba(16,185,129,0.25)]"
                  style={{
                    left: `calc(${bar.left}% + 2px)`,
                    width: `calc(${bar.width}% - 4px)`,
                    minWidth: "4px"
                  }}
                  title={bar.label}
                  aria-label={bar.label}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
          </div>

          {windows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground mt-4">
              No active windows found for today yet.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
