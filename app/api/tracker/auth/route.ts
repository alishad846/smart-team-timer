import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials format" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // Create a plain Supabase client (no cookie persistence for this API endpoint)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Invalid credentials" }, { status: 401 });
    }

    // Now find the user in Prisma to get their organization
    const dbUser = await prisma.user.findUnique({
      where: { authUserId: authData.user.id },
      include: {
        memberships: {
          take: 1,
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!dbUser || dbUser.memberships.length === 0) {
      return NextResponse.json({ error: "User has no active organization" }, { status: 403 });
    }

    const membership = dbUser.memberships[0];

    return NextResponse.json({
      userId: dbUser.id,
      organizationId: membership.organizationId,
      teamId: membership.teamId || "",
      accessToken: process.env.TRACKER_SHARED_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    });

  } catch (error) {
    console.error("Tracker auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
