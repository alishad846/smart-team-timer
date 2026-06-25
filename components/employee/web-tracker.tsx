"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const TRACKING_INTERVAL_MS = 30000; // 30 seconds

export function WebTracker({ userId, organizationId }: { userId: string; organizationId: string }) {
  const router = useRouter();
  
  const state = useRef({
    keyboardSeconds: new Set<number>(),
    mouseSeconds: new Set<number>(),
    lastActivityMs: Date.now()
  });

  useEffect(() => {
    const handleKeyboard = () => {
      const currentSecond = Math.floor(Date.now() / 1000);
      state.current.keyboardSeconds.add(currentSecond);
      state.current.lastActivityMs = Date.now();
    };

    const handleMouse = () => {
      const currentSecond = Math.floor(Date.now() / 1000);
      state.current.mouseSeconds.add(currentSecond);
      state.current.lastActivityMs = Date.now();
    };

    window.addEventListener("keydown", handleKeyboard, { passive: true });
    window.addEventListener("mousemove", handleMouse, { passive: true });
    window.addEventListener("mousedown", handleMouse, { passive: true });
    window.addEventListener("click", handleMouse, { passive: true });
    window.addEventListener("scroll", handleMouse, { passive: true });

    const interval = setInterval(async () => {
      const now = Date.now();
      const currentSecond = Math.floor(now / 1000);
      
      // Calculate percentages based on 30 second window
      const intervalSeconds = TRACKING_INTERVAL_MS / 1000;
      
      // Clean up old entries and count recent ones
      const thirtySecondsAgo = currentSecond - intervalSeconds;
      
      let kCount = 0;
      for (const sec of Array.from(state.current.keyboardSeconds)) {
        if (sec > thirtySecondsAgo) kCount++;
        else state.current.keyboardSeconds.delete(sec);
      }
      
      let mCount = 0;
      for (const sec of Array.from(state.current.mouseSeconds)) {
        if (sec > thirtySecondsAgo) mCount++;
        else state.current.mouseSeconds.delete(sec);
      }

      const keyboardPercent = Math.min(100, Math.round((kCount / intervalSeconds) * 100));
      const mousePercent = Math.min(100, Math.round((mCount / intervalSeconds) * 100));
      
      const idleSeconds = Math.round((now - state.current.lastActivityMs) / 1000);
      const trackingState = idleSeconds >= 15 * 60 ? "IDLE" : "TRACKING";

      const log = {
        userId,
        organizationId,
        activeApp: "Smart Team Timer (Web Fallback)",
        activeWindow: document.title,
        website: window.location.href,
        keyboardPercent,
        mousePercent,
        idleSeconds,
        trackingState,
        capturedAt: new Date().toISOString()
      };

      try {
        const res = await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: [log] })
        });
        
        if (res.ok) {
          router.refresh();
        }
      } catch (err) {
        // silently fail
      }

    }, TRACKING_INTERVAL_MS);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("mousedown", handleMouse);
      window.removeEventListener("click", handleMouse);
      window.removeEventListener("scroll", handleMouse);
      clearInterval(interval);
    };
  }, [userId, organizationId, router]);

  return null;
}
