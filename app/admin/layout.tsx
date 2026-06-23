import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/dashboard/app-shell";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/admin", label: "Overview", icon: "layoutDashboard" },
  { href: "/admin/employees", label: "Employees", icon: "users" },
  { href: "/admin/teams", label: "Teams", icon: "workflow" },
  { href: "/admin/tasks", label: "Tasks", icon: "folderKanban" },
  { href: "/admin/activity", label: "Activity", icon: "barChart3" },
  { href: "/admin/notifications", label: "Notifications", icon: "bell" }
] satisfies NavItem[];

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole !== "admin") {
    redirect("/employee");
  }

  return (
    <AppShell
      title="Admin console"
      subtitle="All employees"
      accent="Broadcast notices and inspect live activity."
      footerNote="Admin views refresh every 30 seconds for a near-live workspace pulse."
      navItems={navItems}
      bellHref="/admin/notifications"
      notificationScope={context.organization.id}
    >
      {children}
    </AppShell>
  );
}
