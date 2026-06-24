"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RequestRecord = {
  id: string;
  createdByName: string | null;
  createdAt: string;
  title: string;
  message: string;
  requestProjectName: string | null;
  requestStartAt: string | null;
  requestEndAt: string | null;
  requestReason: string | null;
  requestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
};

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return { error: text };
  }
}

export function RequestReviewList({ requests }: { requests: RequestRecord[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reviewRequest(id: string, action: "APPROVE" | "REJECT") {
    setBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/notifications/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action })
      });

      const data = (await readJsonResponse(response)) ?? {};

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update request");
      }

      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Could not update request");
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        No pending correction requests right now.
      </div>
    );
  }

  return (
    <div className="max-h-[350px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {requests.map((request) => (
        <div key={request.id} className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">{request.createdByName ?? "Employee"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.requestStartAt && request.requestEndAt
                  ? `${format(new Date(request.requestStartAt), "MMM d, h:mm a")} - ${format(
                      new Date(request.requestEndAt),
                      "h:mm a"
                    )}`
                  : "No time window"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Project: {request.requestProjectName ?? "No project selected"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{request.requestReason ?? request.message}</p>
              {request.reviewedByName ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Reviewed by {request.reviewedByName}
                  {request.reviewedAt ? ` on ${format(new Date(request.reviewedAt), "MMM d, h:mm a")}` : ""}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={request.requestStatus === "APPROVED" ? "success" : "warning"}>
                {request.requestStatus ?? "PENDING"}
              </Badge>
              <p className="text-xs text-muted-foreground">{format(new Date(request.createdAt), "MMM d, h:mm a")}</p>
            </div>
          </div>

          {request.requestStatus === "PENDING" ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => reviewRequest(request.id, "APPROVE")} disabled={busyId === request.id}>
                <Check className="h-4 w-4" />
                {busyId === request.id ? "Approving..." : "Approve"}
              </Button>
              <Button variant="outline" onClick={() => reviewRequest(request.id, "REJECT")} disabled={busyId === request.id}>
                <X className="h-4 w-4" />
                {busyId === request.id ? "Updating..." : "Reject"}
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
