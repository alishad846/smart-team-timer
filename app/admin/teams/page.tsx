import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { TeamsClient } from "./teams-client";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole !== "admin") {
    redirect("/employee");
  }

  // Fetch all teams in the organization
  const teams = await prisma.team.findMany({
    where: {
      organizationId: context.organization.id
    },
    include: {
      leader: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Fetch all members in the organization
  const members = await prisma.teamMember.findMany({
    where: {
      organizationId: context.organization.id
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      },
      team: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <TeamsClient
      initialTeams={teams}
      initialMembers={members}
      organizationId={context.organization.id}
    />
  );
}
