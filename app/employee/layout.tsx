import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/dashboard/app-shell";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

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

  // Check if they lead any team
  const ledTeamsCount = await prisma.team.count({
    where: {
      organizationId: context.organization.id,
      leaderId: context.profile.id
    }
  });

  const dynamicNavItems: NavItem[] = [...navItems];
  if (ledTeamsCount > 0) {
    dynamicNavItems.push({ href: "/employee/team", label: "My Team", icon: "users" });
  }
  if (context.profile.role === "TESTER") {
    dynamicNavItems.push({ href: "/employee/testing", label: "Testing", icon: "shieldCheck" });
  }

  return (
    <AppShell
      title="Employee workspace"
      subtitle="Personal tracking"
      accent="Start your timer, review your stats, and send help requests."
      footerNote="Your tracking data syncs every 30 seconds from the desktop tracker."
      navItems={dynamicNavItems}
      bellHref="/employee/requests"
      notificationScope={context.organization.id}
    >
      {children}
    </AppShell>
  );
}
