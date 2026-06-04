"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TrackingConsentCardProps = {
  consentStatus: "PENDING" | "ACCEPTED" | "REVOKED";
};

export function TrackingConsentCard({ consentStatus }: TrackingConsentCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grantConsent() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const text = await response.text();
      let data: { error?: string } = {};

      if (text) {
        try {
          data = JSON.parse(text) as { error?: string };
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Could not grant tracking permission");
      }

      router.refresh();
    } catch (consentError) {
      setError(consentError instanceof Error ? consentError.message : "Could not grant tracking permission");
    } finally {
      setLoading(false);
    }
  }

  if (consentStatus === "ACCEPTED") {
    return null;
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          Tracking permission required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          During work time, may we take screenshots and track activity for this workspace?
          Once you approve, the desktop tracker will start only while your timer is running, and it will capture
          screenshots on window changes and every 5 minutes.
        </p>
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <Button onClick={grantConsent} disabled={loading}>
          {loading ? "Granting..." : "Yes, allow screenshots during work time"}
        </Button>
      </CardContent>
    </Card>
  );
}
