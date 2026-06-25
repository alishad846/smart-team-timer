import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRouteUser } from "@/lib/auth-route";
import { jsonWithCookies } from "@/lib/http";
import { z } from "zod";

const projectUpdateSchema = z.object({
  teamId: z.string().nullable().optional(),
  name: z.string().min(2).optional(),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"]).optional()
});

type Params = {
  params: Promise<{ projectId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const response = NextResponse.next();
  const context = await requireRouteUser(request, response);

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }



  const { projectId } = await params;
  const body = await request.json();
  const parsed = projectUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return jsonWithCookies(response, { error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Find membership to get organization
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId: context.profile.id,
      status: { not: "REMOVED" }
    }
  });

  if (!membership) {
    return jsonWithCookies(response, { error: "No organization found" }, { status: 404 });
  }

  if (membership.role !== "OWNER" && membership.role !== "MANAGER") {
    return jsonWithCookies(response, { error: "Forbidden" }, { status: 403 });
  }

  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: membership.organizationId
    }
  });

  if (!existingProject) {
    return jsonWithCookies(response, { error: "Project not found" }, { status: 404 });
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      teamId: parsed.data.teamId
    }
  });

  return jsonWithCookies(response, { project: updatedProject });
}
