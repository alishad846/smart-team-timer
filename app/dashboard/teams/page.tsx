import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teams } from "@/lib/mock-data";

export default function TeamsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Team management"
        title="Create and organize teams"
        description="Group interns and employees by function, project ownership, and reporting line."
        actions={<Button><Plus className="h-4 w-4" /> New team</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.name} className="border-border/70">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{team.name}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{team.members} members active</p>
                </div>
                <Badge variant="secondary">{team.productivity}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Projects</span>
                <span className="font-medium">{team.projects}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${team.productivity}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Invitation queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { email: "intern1@company.com", role: "Intern", status: "Pending", team: "Design" },
                { email: "employee2@company.com", role: "Employee", status: "Accepted", team: "Engineering" },
                { email: "manager@company.com", role: "Manager", status: "Pending", team: "Operations" }
              ].map((invite) => (
                <TableRow key={invite.email}>
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell>
                    <Badge variant={invite.status === "Accepted" ? "success" : "warning"}>{invite.status}</Badge>
                  </TableCell>
                  <TableCell>{invite.team}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
