import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { TesterQueue, type TestableTask } from "@/components/employee/tester-queue";

export default async function TestingPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole === "admin") {
    redirect("/admin");
  }

  if (context.membership.role !== "TESTER") {
    redirect("/employee/workspace");
  }

  const rawTasks = await prisma.task.findMany({
    where: {
      status: "REVIEW",
      project: {
        organizationId: context.organization.id
      }
    },
    include: {
      project: true,
      assignee: true
    },
    orderBy: { updatedAt: "desc" }
  });

  const testableTasks: TestableTask[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    projectName: t.project?.name ?? null,
    assigneeName: t.assignee?.fullName ?? null,
    workDetails: t.workDetails,
    githubLink: t.githubLink,
    description: t.description
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Tester Queue"
        title="Tasks Ready for Testing"
        description="Review tasks submitted by the team, verify their fixes, and approve or reject them."
      />

      <TesterQueue tasks={testableTasks} />
    </div>
  );
}
