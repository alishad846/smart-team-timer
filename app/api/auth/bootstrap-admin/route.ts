// Import statements
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createRouteSupabase } from "@/lib/supabase/route-client";
import { getWorkspaceContext } from "@/lib/workspace";

// Helper functions
function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePassword(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createAdminSupabase>,
  email: string
) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = normalizeEmail((body as { email?: unknown }).email);
  const password = normalizePassword((body as { password?: unknown }).password);
  const adminEmail = process.env.FIRST_ADMIN_EMAIL?.trim().toLowerCase();
  const adminName = process.env.FIRST_ADMIN_FULL_NAME?.trim() || "Workspace Owner";
  const adminPassword = process.env.FIRST_ADMIN_PASSWORD ?? "";

  if (!adminEmail) {
    return NextResponse.json({ error: "Missing FIRST_ADMIN_EMAIL" }, { status: 500 });
  }

  if (!adminPassword) {
    return NextResponse.json({ error: "Missing FIRST_ADMIN_PASSWORD" }, { status: 500 });
  }

  if (!email || email !== adminEmail) {
    return NextResponse.json(
      { error: "Admin bootstrap is only available for the configured owner account." },
      { status: 403 }
    );
  }

  if (!password) {
    return NextResponse.json({ error: "Missing password" }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createAdminSupabase();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Missing Supabase admin credentials",
      },
      { status: 500 }
    );
  }

  const existingUser = await findAuthUserByEmail(supabase, adminEmail);

  if (!existingUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: "OWNER",
      },
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? "Unable to create admin account" }, { status: 400 });
    }
  } else {
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: "OWNER",
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message ?? "Unable to update admin account" }, { status: 400 });
    }
  }

  const bootstrapResponse = NextResponse.json({ ok: true });
  const sessionSupabase = createRouteSupabase(request, bootstrapResponse);
  const { error: signInError } = await sessionSupabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message ?? "Unable to sign in admin account" }, { status: 400 });
  }

  const authUsers = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const authUser =
    authUsers.data.users.find((user) => user.email?.toLowerCase() === adminEmail) ?? null;

  // Retrieve workspace context for organization ID
  const context = await getWorkspaceContext();
  if (!context) {
    return NextResponse.json({ error: "Workspace context not found" }, { status: 500 });
  }

  if (authUser) {
    await prisma.user.upsert({
      where: { authUserId: authUser.id },
      update: {
        email: adminEmail,
        fullName: adminName,
        role: Role.OWNER,
      },
      create: {
        authUserId: authUser.id,
        email: adminEmail,
        fullName: adminName,
        role: Role.OWNER,
        organizationId: context.organization.id,
      },
    });
  }

  return bootstrapResponse;
}
