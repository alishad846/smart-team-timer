"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, FolderKanban, LayoutDashboard, Settings, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/teams", label: "Teams", icon: Users },
  { href: "/dashboard/members", label: "Members", icon: ShieldCheck },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/activity", label: "Activity", icon: Workflow },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-border bg-card/85 p-5 backdrop-blur xl:flex">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">SmartTeamTimer</div>
          <div className="text-xs text-muted-foreground">Productivity command center</div>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href as any}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-border bg-gradient-to-br from-sky-500/15 to-emerald-500/10 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="h-4 w-4" />
          Today
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Your tracker is running and activity is being synced every 30 seconds.
        </p>
      </div>
    </aside>
  );
}
