import { format } from "date-fns";
import { redirect } from "next/navigation";
import { BroadcastForm } from "@/components/admin/admin-forms";
import { RequestReviewList } from "@/components/admin/request-review-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { NotificationSeenMarker } from "@/components/dashboard/notification-seen-marker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNotifications } from "@/lib/notifications";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const context = await getWorkspaceContext();

  if (!context) {
    redirect("/auth/login");
  }

  if (context.workspaceRole !== "admin") {
    redirect("/employee");
  }

  const notifications = await listNotifications(context.organization.id, 25);
  const latestNotificationCreatedAt = notifications[0]?.createdAt.toISOString() ?? null;
  const pendingRequests = notifications
    .filter((item) => item.kind === "REQUEST" && item.requestStatus === "PENDING" && item.requestStartAt && item.requestEndAt)
    .map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      requestStartAt: item.requestStartAt ? item.requestStartAt.toISOString() : null,
      requestEndAt: item.requestEndAt ? item.requestEndAt.toISOString() : null,
      reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null
    }));

  return (
    <div className="space-y-8">
      <NotificationSeenMarker scope={context.organization.id} createdAt={latestNotificationCreatedAt} />
      <PageHeader
        badge="Notifications"
        title="Announcements and support messages"
        description="Broadcast announcements to employees or review incoming help requests."
      />

      <section className="space-y-4">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Pending time correction requests</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestReviewList requests={pendingRequests} />
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <BroadcastForm />
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Recent messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              {notifications
                .filter((item) => item.kind === "ANNOUNCEMENT")
                .map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.createdByName ?? "System"} - {format(item.createdAt, "MMM d, h:mm a")}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
