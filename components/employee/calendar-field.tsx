"use client";

import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type CalendarFieldProps = {
  label: string;
  selectedDate: string;
  onChange: (value: string) => void;
};

export function CalendarField({ label, selectedDate, onChange }: CalendarFieldProps) {
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
