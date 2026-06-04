import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { jsonWithCookies } from "@/lib/http";

export async function POST(_request: NextRequest) {
  const response = NextResponse.next();
  const context = await getWorkspaceContext();

  if (!context) {
    return jsonWithCookies(response, { error: "Unauthorized" }, { status: 401 });
  }

  if (context.workspaceRole === "admin") {
    return jsonWithCookies(
      response,
      { error: "Admin accounts do not need employee tracking consent." },
      { status: 403 }
    );
  }

  const member = await prisma.teamMember.update({
    where: { id: context.membership.id },
    data: {
      status: "ACTIVE",
      consentStatus: "ACCEPTED"
    },
    include: {
      user: true,
      team: true,
      organization: true
    }
  });

  return jsonWithCookies(response, { member });
}
