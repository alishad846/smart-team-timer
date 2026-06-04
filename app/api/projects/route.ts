import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRouteUser } from "@/lib/auth-route";
import { projectSchema } from "@/lib/validators";
import { jsonWithCookies } from "@/lib/http";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      organizationId: request.nextUrl.searchParams.get("organizationId") ?? undefined
    },
    orderBy: { createdAt: "desc" }
  });

  return jsonWithCookies(response, { projects });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = projectSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(response, { error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: parsed.data
  });

  return jsonWithCookies(response, { project }, { status: 201 });
}
