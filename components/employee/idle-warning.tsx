"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { IDLE_THRESHOLD_MS, useIdleDetection } from "@/components/employee/use-idle-detection";

const IDLE_SYNC_INTERVAL_MS = 15 * 60 * 1000;

type IdleWarningProps = {
  enabled?: boolean;
};

export function IdleWarning({ enabled = true }: IdleWarningProps) {
  const router = useRouter();
  const idleMs = useIdleDetection(enabled);
  const syncTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  async function syncIdle() {
    try {
      const response = await fetch("/api/browser-idle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idleSeconds: IDLE_SYNC_INTERVAL_MS / 1000 })
      });

      if (!response.ok) {
        return false;
      }

      router.refresh();
      return true;
    } catch {
      // Ignore transient sync issues; the warning still remains visible.
      return false;
    }
  }

  useEffect(() => {
    if (!enabled || idleMs < IDLE_THRESHOLD_MS) {
      if (syncTimerRef.current) {
        window.clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    void syncIdle();

    if (syncTimerRef.current) {
      window.clearInterval(syncTimerRef.current);
    }

    syncTimerRef.current = window.setInterval(() => {
      void syncIdle();
    }, IDLE_SYNC_INTERVAL_MS);

    refreshTimerRef.current = window.setInterval(() => {
      router.refresh();
    }, IDLE_SYNC_INTERVAL_MS);

    return () => {
      if (syncTimerRef.current) {
        window.clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [enabled, idleMs, router]);

  if (idleMs < IDLE_THRESHOLD_MS) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Idle detected and recorded</p>
          <p className="mt-1 text-amber-700/90">
            No mouse or keyboard movement for 15 minutes. This idle time is being recorded separately from active work.
            Move your mouse or press a key to resume active tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
