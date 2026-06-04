import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRouteUser } from "@/lib/auth-route";
import { taskSchema } from "@/lib/validators";
import { jsonWithCookies } from "@/lib/http";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId: request.nextUrl.searchParams.get("projectId") ?? undefined
    },
    orderBy: { createdAt: "desc" }
  });

  return jsonWithCookies(response, { tasks });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = taskSchema.safeParse(body);

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

  const task = await prisma.task.create({
    data: parsed.data
  });

  return jsonWithCookies(response, { task }, { status: 201 });
}
