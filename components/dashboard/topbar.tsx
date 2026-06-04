"use client";

import { Bell, MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-background/60 px-4 py-4 backdrop-blur md:px-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SmartTeamTimer</p>
        <h2 className="text-lg font-semibold">Manager Dashboard</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="rounded-full px-3">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="rounded-full px-3" onClick={toggleTheme}>
          {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>
        <div className="hidden rounded-full border border-border px-3 py-2 text-sm text-muted-foreground md:block">
          Team visibility: Live
        </div>
      </div>
    </header>
  );
}
