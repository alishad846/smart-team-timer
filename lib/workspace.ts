import { Role, type Organization, type TeamMember, type User } from "@prisma/client";
import { createServerSupabase } from "@/lib/supabase/server";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WorkspaceRole = "admin" | "employee";

export type WorkspaceContext = {
  user: {
    id: string;
    email: string;
  };
  profile: User;
  organization: Organization;
  membership: TeamMember;
  workspaceRole: WorkspaceRole;
};

function buildSlug(email: string, suffix: string) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "workspace"}-${suffix}`.slice(0, 60);
}

async function ensureWorkspace(profile: User) {
  const slug = buildSlug(profile.email, profile.id.slice(0, 6));

  // Prefer the newest active membership so invited employees land in the shared
  // workspace instead of an older personal workspace they may have created first.
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId: profile.id,
      status: {
        not: "REMOVED"
      }
    },
    include: {
      organization: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (membership) {
    return {
      organization: membership.organization,
      membership,
      profile
    };
  }

  const organization = await prisma.organization.upsert({
    where: { slug },
    update: {
      name: `${profile.fullName}'s Workspace`,
      description: "Default SmartTeamTimer workspace"
    },
    create: {
      name: `${profile.fullName}'s Workspace`,
      slug,
      description: "Default SmartTeamTimer workspace"
    }
  });

  const team =
    (await prisma.team.findFirst({
      where: {
        organizationId: organization.id,
        name: "Core Team"
      }
    })) ??
    (await prisma.team.create({
      data: {
        organizationId: organization.id,
        name: "Core Team",
        description: "Default team for the workspace"
      }
    }));

  const createdMembership = await prisma.teamMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: profile.id
      }
    },
    update: {
      teamId: team.id,
      role: Role.OWNER,
      status: "ACTIVE",
      consentStatus: "ACCEPTED",
      title: "Workspace Owner"
    },
    create: {
      organizationId: organization.id,
      teamId: team.id,
      userId: profile.id,
      role: Role.OWNER,
      status: "ACTIVE",
      consentStatus: "ACCEPTED",
      title: "Workspace Owner"
    },
    include: {
      organization: true
    }
  });

  await prisma.user.update({
    where: { id: profile.id },
    data: {
      role: Role.OWNER
    }
  });

  return {
    organization: createdMembership.organization,
    membership: createdMembership,
    profile: {
      ...profile,
      role: Role.OWNER
    }
  };
}

export const getWorkspaceContext = cache(async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  // Directly fetch the authenticated user from Supabase instead of calling getCurrentUser (which itself calls this function).
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Find or create the user profile in the database. This mirrors the logic in getCurrentUser without invoking the circular call.
  const profile = await prisma.user.upsert({
    where: { authUserId: user.id },
    update: {
      email: user.email ?? `${user.id}@local.invalid`,
      fullName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Team Member"
    },
    create: {
      authUserId: user.id,
      email: user.email ?? `${user.id}@local.invalid`,
      fullName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Team Member",
      // Create a default organization for the user to satisfy the required relation
      organization: {
        create: {
          name: `${user.email ?? "User"}'s Workspace`,
          slug: buildSlug(user.email ?? `${user.id}@local.invalid`, user.id.slice(0, 6)),
          description: "Default SmartTeamTimer workspace"
        }
      }
    }
  });


  const { organization, membership, profile: ensuredProfile } = await ensureWorkspace(profile);

  return {
    user: {
      id: user.id,
      email: user.email ?? profile.email
    },
    profile: ensuredProfile,
    organization,
    membership,
    workspaceRole: ensuredProfile.role === Role.OWNER || ensuredProfile.role === Role.MANAGER ? "admin" : "employee"
  };
});

export async function requireWorkspaceContext() {
  const context = await getWorkspaceContext();
  if (!context) {
    return null;
  }

  return context;
}
