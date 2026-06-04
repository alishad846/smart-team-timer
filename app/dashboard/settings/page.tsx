import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Privacy and controls"
        title="Tracking transparency settings"
        description="Enable or disable screenshot capture, consent prompts, retention, and tracker visibility for employees."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Consent controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { label: "Show tracking indicator", helper: "Display when the desktop tracker is active." },
              { label: "Enable screenshot capture", helper: "Capture optional screenshots every 5 minutes." },
              { label: "Track active website titles", helper: "Store domain and active tab metadata." },
              { label: "Allow pause/resume", helper: "Employees can pause tracking during breaks." }
            ].map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-4">
                <div>
                  <Label>{item.label}</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
                </div>
                <Switch checked={index !== 1} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Retention policy</CardTitle>
              <Badge variant="secondary">MVP default</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="font-medium">Screenshots retained for 30 days</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This keeps audits available while limiting long-term storage of sensitive imagery.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="font-medium">Activity logs retained for 180 days</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aggregated app and website usage can be kept longer for trend reporting.
              </p>
            </div>
            <Button className="w-full">Save policy</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
