"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

type LocalTimeRangeProps = {
  start: string | Date;
  end: string | Date;
};

export function LocalTimeRange({ start, end }: LocalTimeRangeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR to prevent hydration mismatch
    return <span className="animate-pulse bg-muted rounded w-32 h-4 inline-block" />;
  }

  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (
      <span>
        {format(startDate, "MMM d, h:mm a")} - {format(endDate, "h:mm a")}
      </span>
    );
  } catch {
    return <span>Invalid time window</span>;
  }
}
