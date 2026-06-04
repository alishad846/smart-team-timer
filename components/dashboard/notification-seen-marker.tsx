"use client";

import { useEffect } from "react";
import { markNotificationsAsSeen } from "@/components/dashboard/notification-bell";

type NotificationSeenMarkerProps = {
  scope: string;
  createdAt?: string | null;
};

export function NotificationSeenMarker({ scope, createdAt }: NotificationSeenMarkerProps) {
  useEffect(() => {
    markNotificationsAsSeen(scope, createdAt);
  }, [scope, createdAt]);

  return null;
}

