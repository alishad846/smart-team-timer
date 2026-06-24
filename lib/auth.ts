import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

function resolveWorkspaceRole(role?: string | null) {
  if (role === "OWNER" || role === "MANAGER" || role === "EMPLOYEE" || role === "INTERN") {
    return role as Role;
  }

  return null;
}

function resolveUserRole(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const metadataRole = resolveWorkspaceRole(typeof user.user_metadata?.role === "string" ? user.user_metadata.role : null);
  const adminEmail = process.env.FIRST_ADMIN_EMAIL?.toLowerCase();
  const normalizedEmail = user.email?.toLowerCase() ?? "";

  if (metadataRole) {
    return metadataRole;
  }

  if (adminEmail && normalizedEmail === adminEmail) {
    return Role.OWNER;
  }

  return null;
}

function resolveGithubUsername(user: {
  user_metadata?: Record<string, unknown> | null;
}) {
  const github = user.user_metadata?.github_username;

  if (typeof github !== "string") {
    return undefined;
  }

  const normalized = github.trim().replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const resolvedRole = resolveUserRole(user);

  const context = await getWorkspaceContext();
  if (!context) {
    throw new Error("Workspace context not found");
  }
  const profile = await prisma.user.upsert({
    where: { authUserId: user.id },
    update: {
      email: user.email ?? `${user.id}@local.invalid`,
      fullName:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        "Team Member",
      githubUsername: resolveGithubUsername(user) ?? undefined,
      ...(resolvedRole ? { role: resolvedRole } : {})
    },
    create: {
      authUserId: user.id,
      email: user.email ?? `${user.id}@local.invalid`,
      fullName:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        "Team Member",
      githubUsername: resolveGithubUsername(user),
      role: resolvedRole ?? Role.EMPLOYEE,
      organization: { connect: { id: context.organization.id } },
    }
  });

  return { user, profile };
});

export async function requireUser() {
  const context = await getCurrentUser();
  if (!context) {
    redirect("/auth/login");
  }
  return context;
}
