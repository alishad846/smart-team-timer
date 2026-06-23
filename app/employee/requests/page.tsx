import { format } from "date-fns";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SupportRequestCard } from "@/components/employee/support-request-card";
import RequestFormSwitcher from "@/components/employee/request-form-switcher";
import { TrackingConsentCard } from "@/components/employee/tracking-consent-card";
import { NotificationSeenMarker } from "@/components/dashboard/notification-seen-marker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/workspace";
import { loadEmployeeDashboardData } from "@/lib/employee-dashboard";

export default async function EmployeeRequestsPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole === "admin") {
    redirect("/admin");
  }

  const data = await loadEmployeeDashboardData({
    organizationId: context.organization.id,
    userId: context.profile.id
  });
  const latestNotificationCreatedAt = data.notifications[0]?.createdAt.toISOString() ?? null;

  return (
    <div className="space-y-8">
      <NotificationSeenMarker scope={context.organization.id} createdAt={latestNotificationCreatedAt} />
      <PageHeader
        badge="Employee requests"
        title="Help requests and admin updates"
        description="Use this page when you miss a timer start or need clarification from your manager."
      />

      <TrackingConsentCard consentStatus={context.membership.consentStatus} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <RequestFormSwitcher projects={data.projects} teamLeads={data.teamLeads} defaultProjectId={data.activeEntry?.projectId ?? ""} />

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Your recent requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.notifications.filter((item) => item.kind === "REQUEST" && item.createdById === context.profile.id).length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No correction requests submitted yet.
                </div>
              ) : null}
              {data.notifications
                .filter((item) => item.kind === "REQUEST" && item.createdById === context.profile.id)
                .slice(0, 6)
                .map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.requestStartAt && item.requestEndAt
                            ? `${format(item.requestStartAt, "MMM d, h:mm a")} - ${format(item.requestEndAt, "h:mm a")}`
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
            <CardContent className="space-y-4">
              {data.notifications.filter((item) => item.kind === "REQUEST" && item.title.toLowerCase().includes("leave") && item.requestStatus === "APPROVED" && item.createdById === context.profile.id).length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No approved leaves recorded.
                </div>
              ) : null}
              {data.notifications
                .filter((item) => item.kind === "REQUEST" && item.title.toLowerCase().includes("leave") && item.requestStatus === "APPROVED" && item.createdById === context.profile.id)
                .map((item) => (
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
        </div>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Admin updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.notifications
              .filter((item) => item.kind === "ANNOUNCEMENT")
              .slice(0, 8)
              .map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.createdByName ?? "Admin"} - {format(item.createdAt, "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary">{item.kind}</Badge>
                      <Badge variant="outline">{item.audience}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{item.message}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
