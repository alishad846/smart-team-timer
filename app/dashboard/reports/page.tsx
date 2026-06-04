import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dashboardOverview } from "@/lib/mock-data";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Weekly reports"
        title="Export manager-ready reports"
        description="Summarize productivity, focus time, and activity trends for stakeholders and team leads."
        actions={
          <Button>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>AI productivity summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <Badge>Generated today</Badge>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{dashboardOverview.aiSummary}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Productive blocks", value: "34" },
                { label: "Idle windows", value: "8" },
                { label: "Focus sessions", value: "21" },
                { label: "App switches", value: "112" }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Weekly report queue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Focus</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { team: "Engineering", status: "Ready", focus: "88%", trend: "+6%" },
                  { team: "Design", status: "Ready", focus: "82%", trend: "+3%" },
                  { team: "Intern Cohort", status: "Draft", focus: "76%", trend: "+8%" }
                ].map((report) => (
                  <TableRow key={report.team}>
                    <TableCell className="font-medium">{report.team}</TableCell>
                    <TableCell>
                      <Badge variant={report.status === "Ready" ? "success" : "warning"}>{report.status}</Badge>
                    </TableCell>
                    <TableCell>{report.focus}</TableCell>
                    <TableCell className="text-emerald-500">{report.trend}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
