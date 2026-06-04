import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRouteSupabase } from "@/lib/supabase/route-client";

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

export async function requireRouteUser(request: NextRequest, response: NextResponse) {
  const supabase = createRouteSupabase(request, response);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const resolvedRole = resolveUserRole(user);

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
      role: resolvedRole ?? Role.EMPLOYEE
    }
  });

  return { user, profile, supabase };
}
