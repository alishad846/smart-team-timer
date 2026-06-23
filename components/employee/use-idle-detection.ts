"use client";

import { useEffect, useState } from "react";

export const IDLE_THRESHOLD_MS = 15 * 60 * 1000;

export function useIdleDetection(enabled = true) {
  const [idleMs, setIdleMs] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIdleMs(0);
      return;
    }

    let lastActivity = Date.now();

    const bumpActivity = () => {
      lastActivity = Date.now();
      setIdleMs(0);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    events.forEach((eventName) => window.addEventListener(eventName, bumpActivity, { passive: true }));
    document.addEventListener("visibilitychange", bumpActivity);

    const timer = window.setInterval(() => {
      setIdleMs(Date.now() - lastActivity);
    }, 1000);

    return () => {
      window.clearInterval(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, bumpActivity));
      document.removeEventListener("visibilitychange", bumpActivity);
    };
  }, [enabled]);

  return idleMs;
}
