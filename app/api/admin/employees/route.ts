import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonWithCookies } from "@/lib/http";
import { employeeInviteSchema } from "@/lib/validators";
import { getWorkspaceContext } from "@/lib/workspace";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  if (context.workspaceRole !== "admin") {
    return jsonWithCookies(response, { error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = employeeInviteSchema.safeParse(body);

  if (!parsed.success) {
    const validationMessage = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter(Boolean)
      .join(" ");

    return jsonWithCookies(
      response,
      { error: validationMessage || "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch (supabaseError) {
    return jsonWithCookies(
      response,
      {
        error: supabaseError instanceof Error ? supabaseError.message : "Missing Supabase admin credentials"
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      github_username: parsed.data.githubUsername ?? "",
      role: parsed.data.role
    }
  });

  if (error || !data.user) {
    return jsonWithCookies(
      response,
      {
        error: error?.message ?? "Unable to create employee account"
      },
      { status: 400 }
    );
  }

  const team =
    (parsed.data.teamId
      ? await prisma.team.findFirst({ where: { id: parsed.data.teamId, organizationId: context.organization.id } })
      : await prisma.team.findFirst({
          where: { organizationId: context.organization.id },
          orderBy: { createdAt: "asc" }
        })) ?? null;

  const profile = await prisma.user.upsert({
    where: { authUserId: data.user.id },
    update: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      githubUsername: parsed.data.githubUsername ?? null,
      role: parsed.data.role as Role
    },
    create: {
      authUserId: data.user.id,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      githubUsername: parsed.data.githubUsername ?? null,
      role: parsed.data.role as Role,
      organizationId: context.organization.id,
    }
  });

  const existingMember = await prisma.teamMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: context.organization.id,
        userId: profile.id
      }
    }
  });

  const member = existingMember
    ? await prisma.teamMember.update({
        where: { id: existingMember.id },
      data: {
        teamId: team?.id ?? null,
        role: parsed.data.role as Role,
        status: existingMember.status === "REMOVED" ? "INVITED" : existingMember.status,
        consentStatus: "PENDING",
        title: parsed.data.title
      },
        include: {
          user: true,
          team: true
        }
      })
    : await prisma.teamMember.create({
        data: {
          organizationId: context.organization.id,
          teamId: team?.id ?? null,
          userId: profile.id,
          role: parsed.data.role as Role,
          status: "INVITED",
          consentStatus: "PENDING",
          title: parsed.data.title
        },
        include: {
          user: true,
          team: true
        }
      });

  return jsonWithCookies(response, { employee: { profile, member } }, { status: 201 });
}
