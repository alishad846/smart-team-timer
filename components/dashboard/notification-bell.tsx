"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  href: string;
  scope: string;
};

type NotificationItem = {
  id: string;
  createdAt: string;
};

function storageKey(scope: string) {
  return `stt:notifications:last-seen:${scope}`;
}

function getLatestTimestamp(notifications: NotificationItem[]) {
  return notifications.length > 0 ? new Date(notifications[0].createdAt).getTime() : 0;
}

function playNotificationSound() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const audio = new Audio("/notification.mp3");
    void audio.play();
  } catch {
    // Ignore audio playback failures when the browser blocks autoplay.
  }
}

export function NotificationBell({ href, scope }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const initializedRef = useRef(false);
  const lastNotifiedIdRef = useRef<string | null>(null);
  const unreadCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function syncNotifications() {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache"
          }
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { notifications?: NotificationItem[] };
        const notifications = data.notifications ?? [];
        const latest = notifications[0];
        const latestTimestamp = getLatestTimestamp(notifications);
        const seenAtRaw = window.localStorage.getItem(storageKey(scope));
        const seenAt = seenAtRaw ? Number(seenAtRaw) : 0;

        if (!initializedRef.current) {
          initializedRef.current = true;
          const initialSeenAt = latestTimestamp || Date.now();
          window.localStorage.setItem(storageKey(scope), String(initialSeenAt));
          if (!cancelled) {
            unreadCountRef.current = 0;
            setUnreadCount(0);
          }
          return;
        }

        const nextUnread = notifications.filter((item) => new Date(item.createdAt).getTime() > seenAt).length;
        const previousUnread = unreadCountRef.current;

        if (latest && latest.id !== lastNotifiedIdRef.current && latestTimestamp > seenAt) {
          lastNotifiedIdRef.current = latest.id;
          if (nextUnread > previousUnread) {
            playNotificationSound();
            setPulse(true);
            window.setTimeout(() => setPulse(false), 1100);
          }
        }

        if (!cancelled) {
          unreadCountRef.current = nextUnread;
          setUnreadCount(nextUnread);
        }
      } catch {
        // Ignore transient network errors. The badge will update on the next poll.
      }
    }

    void syncNotifications();
    const timer = window.setInterval(() => {
      void syncNotifications();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [scope]);

  return (
    <Button asChild variant="outline" size="sm" className="rounded-full px-3">
      <Link
        href={href as any}
        aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Open notifications"}
      >
        <span className="relative inline-flex items-center">
          <Bell className={cn("h-4 w-4 transition-transform", pulse && "scale-110")} />
          {unreadCount > 0 ? (
            <Badge
              variant="warning"
              className={cn(
                "absolute -right-3 -top-3 min-w-5 justify-center px-1.5 py-0.5 text-[10px] leading-none shadow-lg",
                pulse && "animate-pulse"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </span>
      </Link>
    </Button>
  );
}

export function markNotificationsAsSeen(scope: string, createdAt?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const nextSeenAt = createdAt ? new Date(createdAt).getTime() : Date.now();
  window.localStorage.setItem(storageKey(scope), String(nextSeenAt));
}
