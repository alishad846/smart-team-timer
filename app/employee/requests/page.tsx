import { format } from "date-fns";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChevronDown } from "lucide-react";
import { SupportRequestCard } from "@/components/employee/support-request-card";
import RequestFormSwitcher from "@/components/employee/request-form-switcher";
import { TrackingConsentCard } from "@/components/employee/tracking-consent-card";
import { NotificationSeenMarker } from "@/components/dashboard/notification-seen-marker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

import { listNotifications } from "@/lib/notifications";
import type { NotificationRecord } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export default async function EmployeeRequestsPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole === "admin") {
    redirect("/admin");
  }

  const [projects, managers, activeEntry, notifications] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: context.organization.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true }
    }),
    prisma.teamMember.findMany({
      where: {
        organizationId: context.organization.id,
        role: { in: ["OWNER", "MANAGER"] }
      },
      include: {
        user: true
      }
    }),
    prisma.timeEntry.findFirst({
      where: {
        organizationId: context.organization.id,
        userId: context.profile.id,
        status: { in: ["RUNNING", "PAUSED"] }
      },
      select: {
        projectId: true
      }
    }),
    listNotifications(context.organization.id, 50, context.profile.id)
  ]);

  const memberWithTeam = await prisma.teamMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: context.organization.id,
        userId: context.profile.id
      }
    },
    include: {
      team: true
    }
  });
  const teamName = memberWithTeam?.team?.name ?? "Unassigned";

  const teamLeads = managers.map((m: { user: { id: string; fullName: string } }) => ({ id: m.user.id, fullName: m.user.fullName }));
  const latestNotificationCreatedAt = notifications[0]?.createdAt.toISOString() ?? null;

  return (
    <div className="space-y-8">
      <NotificationSeenMarker scope={context.organization.id} createdAt={latestNotificationCreatedAt} />
      <PageHeader
        badge="Employee requests"
        title="Help requests and admin updates"
        description="Use this page when you miss a timer start or need clarification from your manager."
      />

      <TrackingConsentCard consentStatus={context.membership.consentStatus} />

      <div className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <RequestFormSwitcher
            projects={projects}
            teamLeads={teamLeads}
            defaultProjectId={activeEntry?.projectId ?? ""}
            teamName={teamName}
          />

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Inbox & Activity Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications
                .filter((item: NotificationRecord) => item.kind === "ANNOUNCEMENT")
                .slice(0, 8)
                .map((item: NotificationRecord) => {
                  const isApproved = item.title.toLowerCase().includes("approved");
                  const isRejected = item.title.toLowerCase().includes("rejected");

                  return (
                    <details
                      key={item.id}
                      className={cn(
                        "group rounded-2xl border p-4 transition-all duration-300 shadow-sm",
                        isApproved
                          ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-950 dark:text-emerald-50"
                          : isRejected
                            ? "border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10 text-rose-950 dark:text-rose-50"
                            : "border-border bg-muted/30"
                      )}
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
                        <div>
                          <p className="font-semibold text-sm leading-none tracking-tight">{item.title}</p>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {item.createdByName ?? "Admin"} - {format(item.createdAt, "MMM d, h:mm a")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isApproved ? (
                            <Badge variant="success">Approved</Badge>
                          ) : isRejected ? (
                            <Badge variant="warning">Rejected</Badge>
                          ) : (
                            <>
                              <Badge variant="secondary">{item.kind}</Badge>
                              <Badge variant="outline">{item.audience}</Badge>
                            </>
                          )}
                          <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                        </div>
                      </summary>
                      <div className="mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground animate-in slide-in-from-top-1 fade-in duration-200">
                        {item.message}
                      </div>
                    </details>
                  );
                })}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Your recent requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[30rem] overflow-y-auto pr-2">
              {notifications.filter((item: NotificationRecord) => item.kind === "REQUEST" && !item.title.toLowerCase().includes("leave") && item.createdById === context.profile.id).length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No correction requests submitted yet.
                </div>
              ) : null}
              {notifications
                .filter((item: NotificationRecord) => item.kind === "REQUEST" && !item.title.toLowerCase().includes("leave") && item.createdById === context.profile.id)
                .map((item: NotificationRecord) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.requestStartAt && item.requestEndAt
                            ? `${format(item.requestStartAt, "MMM d, HH:mm")} - ${format(item.requestEndAt, "HH:mm")}`
                            : "No time window"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Project: {item.requestProjectName ?? "No project selected"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={item.requestStatus === "APPROVED" ? "success" : "warning"}>
                          {item.requestStatus ?? "PENDING"}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{item.requestReason ?? item.message}</p>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Approved Leaves & Reasons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[30rem] overflow-y-auto pr-2">
              {notifications.filter((item: NotificationRecord) => item.kind === "REQUEST" && item.title.toLowerCase().includes("leave") && item.requestStatus === "APPROVED" && item.createdById === context.profile.id).length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No approved leaves recorded.
                </div>
              ) : null}
              {notifications
                .filter((item: NotificationRecord) => item.kind === "REQUEST" && item.title.toLowerCase().includes("leave") && item.requestStatus === "APPROVED" && item.createdById === context.profile.id)
                .map((item: NotificationRecord) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.requestStartAt && item.requestEndAt
                            ? `${format(item.requestStartAt, "MMM d, yyyy")} - ${format(item.requestEndAt, "MMM d, yyyy")}`
                            : "No time window"}
                        </p>
                      </div>
                      <Badge variant="success">Approved</Badge>
                    </div>
                    {item.requestReason && (
                      <p className="mt-2.5 text-sm text-muted-foreground">
                        <strong className="text-foreground">Reason:</strong> {item.requestReason}
                      </p>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
