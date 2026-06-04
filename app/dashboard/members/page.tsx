import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MembersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        badge="Member management"
        title="Track employee and intern access"
        description="Review roles, permissions, consent status, and productivity visibility for every team member."
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Consent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Aarav Singh", role: "Intern", team: "Intern Cohort", consent: "Enabled", status: "Active" },
                { name: "Maya Patel", role: "Employee", team: "Engineering", consent: "Enabled", status: "Active" },
                { name: "Jordan Lee", role: "Employee", team: "Design", consent: "Pending", status: "Inactive" }
              ].map((member) => (
                <TableRow key={member.name}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{member.team}</TableCell>
                  <TableCell>
                    <Badge variant={member.consent === "Enabled" ? "success" : "warning"}>{member.consent}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "Active" ? "default" : "secondary"}>{member.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
