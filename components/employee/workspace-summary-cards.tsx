"use client";

import { useEffect, useState } from "react";
import { startOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { buildActivitySnapshot } from "@/lib/activity-periods";
import { formatDuration, formatPercent } from "@/lib/utils";

type WorkspaceTimeEntry = {
  startedAt: string;
  productiveSeconds: number;
  idleSeconds: number;
  totalSeconds: number;
};

type WorkspaceSummaryCardsProps = {
  userId: string;
  organizationId: string;
  initialEntries: WorkspaceTimeEntry[];
  initialSummary: {
    todayProductiveMinutes: number;
    todayProductivityScore: number;
    todayCreditsEarned: number;
    streakDays: number;
  };
};

function toSnapshotEntries(entries: WorkspaceTimeEntry[]) {
  return entries.map((entry) => ({
    startedAt: new Date(entry.startedAt),
    productiveSeconds: entry.productiveSeconds,
    idleSeconds: entry.idleSeconds
  }));
}

export function WorkspaceSummaryCards({ userId, organizationId, initialEntries, initialSummary }: WorkspaceSummaryCardsProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [summary, setSummary] = useState(initialSummary);

  function buildSummary(nextEntries: WorkspaceTimeEntry[]) {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const snapshotEntries = toSnapshotEntries(nextEntries);
    const todayEntries = snapshotEntries.filter((entry) => entry.startedAt.getTime() >= todayStart);
    const todaySnapshot = buildActivitySnapshot(todayEntries, "daily", now);
    const streakSnapshot = buildActivitySnapshot(snapshotEntries, "weekly", now);

    return {
      todayProductiveMinutes: todaySnapshot.productiveMinutes,
      todayProductivityScore: todaySnapshot.productivityScore,
      todayCreditsEarned: todaySnapshot.creditsEarned,
      streakDays: streakSnapshot.streakDays
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function syncEntries() {
      try {
        const params = new URLSearchParams({
          userId,
          organizationId
        });
        const response = await fetch(`/api/time-entries?${params.toString()}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { entries?: WorkspaceTimeEntry[] };
        if (cancelled || !Array.isArray(data.entries)) {
          return;
        }

        setEntries(
          data.entries.map((entry) => ({
            startedAt: entry.startedAt,
            productiveSeconds: entry.productiveSeconds,
            idleSeconds: entry.idleSeconds,
            totalSeconds: entry.totalSeconds
          }))
        );
        setSummary(buildSummary(data.entries.map((entry) => ({
          startedAt: entry.startedAt,
          productiveSeconds: entry.productiveSeconds,
          idleSeconds: entry.idleSeconds,
          totalSeconds: entry.totalSeconds
        }))));
      } catch {
        // Keep the previous snapshot if a refresh fails transiently.
      }
    }

    void syncEntries();
    const timer = window.setInterval(() => {
      void syncEntries();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [organizationId, userId]);
  return (
    <section className="grid gap-4 lg:grid-cols-4">
      <Card className="border-border/70">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">Active work time today</p>
          <div className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold">{formatDuration(summary.todayProductiveMinutes)}</p>
            <p className="text-sm font-medium text-emerald-500">Resets daily</p>
          </div>
          <p className="text-sm text-muted-foreground">This shows productive work only and resets at midnight.</p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">Activity score</p>
          <div className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold">{formatPercent(summary.todayProductivityScore)}</p>
            <p className="text-sm font-medium text-emerald-500">Today</p>
          </div>
          <p className="text-sm text-muted-foreground">Based on productive time versus idle time.</p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">Credits earned</p>
          <div className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold">{summary.todayCreditsEarned}</p>
            <p className="text-sm font-medium text-emerald-500">1 hr = 3</p>
          </div>
          <p className="text-sm text-muted-foreground">1 hour of productive work earns 3 credits.</p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">Streak</p>
          <div className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold">{summary.streakDays} days</p>
            <p className="text-sm font-medium text-emerald-500">Motivation</p>
          </div>
          <p className="text-sm text-muted-foreground">Consecutive days meeting the daily credit goal.</p>
        </CardContent>
      </Card>
    </section>
  );
}
