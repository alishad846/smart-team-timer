import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRouteUser } from "@/lib/auth-route";
import { jsonWithCookies } from "@/lib/http";

type Params = {
  params: Promise<{ teamId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: true,
      projects: true
    }
  });

  return jsonWithCookies(response, { team });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const body = await request.json();
  const team = await prisma.team.update({
    where: { id: teamId },
    data: body
  });

  return jsonWithCookies(response, { team });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  await prisma.team.delete({ where: { id: teamId } });
  return jsonWithCookies(response, { ok: true });
}
