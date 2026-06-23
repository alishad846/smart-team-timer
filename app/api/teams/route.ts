import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRouteUser } from "@/lib/auth-route";
import { teamSchema } from "@/lib/validators";
import { jsonWithCookies } from "@/lib/http";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.teamMember.findFirst({
    where: {
      userId: context.profile.id,
      status: { not: "REMOVED" }
    }
  });

  if (!membership) {
    return jsonWithCookies(response, { error: "No organization found" }, { status: 404 });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId") ?? membership.organizationId;

  const teams = await prisma.team.findMany({
    where: {
      organizationId
    },
    include: {
      leader: true,
      members: {
        include: {
          user: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return jsonWithCookies(response, { teams });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = teamSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(response, { error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: parsed.data,
    include: {
      leader: true,
      members: {
        include: {
          user: true
        }
      }
    }
  });

  return jsonWithCookies(response, { team }, { status: 201 });
}
