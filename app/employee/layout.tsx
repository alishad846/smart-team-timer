import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/dashboard/app-shell";
import { getWorkspaceContext } from "@/lib/workspace";

const navItems = [
  { href: "/employee/workspace", label: "Workspace", icon: "layoutDashboard" },
  { href: "/employee/analytics", label: "Analytics", icon: "barChart3" },
  { href: "/employee/activity", label: "Activity", icon: "timerReset" },
  { href: "/employee/requests", label: "Requests", icon: "messageSquarePlus" }
] satisfies NavItem[];

export default async function EmployeeLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole === "admin") {
    redirect("/admin");
  }

  return (
    <AppShell
      title="Employee workspace"
      subtitle="Personal tracking"
      accent="Start your timer, review your stats, and send help requests."
      footerNote="Your tracking data syncs every 30 seconds from the desktop tracker."
      navItems={navItems}
      bellHref="/employee/requests"
      notificationScope={context.organization.id}
    >
      {children}
    </AppShell>
  );
}
