"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  FolderKanban,
  LayoutDashboard,
  MessageSquarePlus,
  MoonStar,
  Settings,
  ShieldCheck,
  Sparkles,
  LogOut,
  SunMedium,
  TimerReset,
  Users,
  Workflow,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { createClient } from "@/lib/supabase/client";

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
};

type AppShellProps = {
  title: string;
  subtitle: string;
  accent: string;
  navItems: NavItem[];
  footerNote: string;
  bellHref?: string;
  notificationScope?: string;
  children: ReactNode;
};

const iconMap = {
  layoutDashboard: LayoutDashboard,
  users: Users,
  barChart3: BarChart3,
  workflow: Workflow,
  folderKanban: FolderKanban,
  shieldCheck: ShieldCheck,
  settings: Settings,
  bell: Bell,
  timerReset: TimerReset,
  messageSquarePlus: MessageSquarePlus
} satisfies Record<string, LucideIcon>;

export function AppShell({
  title,
  subtitle,
  accent,
  navItems,
  footerNote,
  bellHref,
  notificationScope = "global",
  children
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const { logoutAction } = await import("@/app/auth/actions");
      await logoutAction();
      router.replace("/auth/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LiveRefresh />
      <div className="xl:grid xl:min-h-screen xl:grid-cols-[18rem_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-card/90 p-5 backdrop-blur xl:flex">
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">SmartTeamTimer</div>
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const baseHref = item.href.split("#")[0];
              const active =
                !item.href.includes("#") &&
                (pathname === baseHref || (baseHref !== "/admin" && pathname.startsWith(`${baseHref}/`)));
              const Icon = iconMap[item.icon];

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
              <Bell className="h-4 w-4" />
              Live pulse
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{footerNote}</p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-background/70 px-4 py-4 backdrop-blur md:px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">SmartTeamTimer</p>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{accent}</p>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell href={(bellHref ?? "/admin/notifications") as any} scope={notificationScope} />
              <Button variant="outline" size="sm" className="rounded-full px-3" onClick={toggleTheme}>
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-3"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2 hidden md:inline">{loggingOut ? "Logging out..." : "Logout"}</span>
              </Button>
              <div className="hidden rounded-full border border-border px-3 py-2 text-sm text-muted-foreground md:block">
                {subtitle}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
