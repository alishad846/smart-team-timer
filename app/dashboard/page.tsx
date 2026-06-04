import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function DashboardRedirectPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  redirect(context.workspaceRole === "admin" ? "/admin" : "/employee/workspace");
}
