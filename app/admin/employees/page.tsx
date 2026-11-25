"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InviteEmployeeForm } from "@/components/admin/admin-forms";
import { RemoveEmployeeButton } from "@/components/admin/remove-employee-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePaginatedData } from "@/lib/data-fetch";

interface Team {
  id: string;
  name: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  githubUsername: string | null;
}

interface TeamMemberWithRelations {
  id: string;
  userId: string;
  teamId: string | null;
  role: string;
  status: string;
  consentStatus: string;
  user: User;
  team: Team | null;
}

interface Leave {
  id: string;
  createdById: string;
  requestStartAt: string | null;
  requestEndAt: string | null;
}

interface AdminEmployeesResponse {
  teams: Team[];
  members: TeamMemberWithRelations[];
  totalMembers: number;
  approvedLeaves: Leave[];
  page: number;
  size: number;
  totalPages: number;
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const size = Math.min(Number(searchParams.get("size")) || 20, 50);

  const { data, loading, error, refetch } = usePaginatedData<TeamMemberWithRelations>(
    "/api/admin/employees",
    page,
    size,
    { ttl: 5 * 60 * 1000 }
  );

  const [teams, setTeams] = useState<Team[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [approvedLeaves, setApprovedLeaves] = useState<Leave[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch teams and leaves separately (they don't change often)
  const fetchStaticData = async () => {
    try {
      const response = await fetch("/api/admin/employees");
      if (response.ok) {
        const result: AdminEmployeesResponse = await response.json();
        setTeams(result.teams);
        setTotalMembers(result.totalMembers);
        setApprovedLeaves(result.approvedLeaves);
        setTotalPages(result.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch static data:", err);
    }
  };

  // We need to fetch static data on mount and when page changes
  // But we use the cached data for the main table

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/admin/employees?${params.toString()}`);
  };

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <PageHeader
          badge="Employee management"
          title="Add people and review access"
          description="Create employee logins, store their GitHub profile, and open their individual activity page."
        />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          badge="Employee management"
          title="Add people and review access"
          description="Create employee logins, store their GitHub profile, and open their individual activity page."
        />
        <Card className="border-border/70">
          <CardContent className="py-8 text-center text-destructive">
            Failed to load employees. <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats from data
  const membersResult = data || [];
  const githubProfilesCount = membersResult.filter((m) => m.user.githubUsername).length;

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Employee management"
        title="Add people and review access"
        description="Create employee logins, store their GitHub profile, and open their individual activity page."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Active members</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-3xl font-semibold">{totalMembers}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>GitHub profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{githubProfilesCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{teams.length}</p>
          </CardContent>
        </Card>
      </section>

      <div className="space-y-8">
        <InviteEmployeeForm teams={teams.map((team: Team) => ({ id: team.id, name: team.name }))} />

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Member directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>GitHub</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Consent</TableHead>
                    <TableHead>Leaves</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {membersResult.map((member: TeamMemberWithRelations) => {
                    const userLeaves = approvedLeaves.filter((leave: Leave) => leave.createdById === member.userId);
                    const now = new Date();
                    const isOnLeaveNow = userLeaves.some((leave: Leave) => {
                      if (!leave.requestStartAt || !leave.requestEndAt) return false;
                      const start = new Date(leave.requestStartAt);
                      const end = new Date(leave.requestEndAt);
                      return now >= start && now <= end;
                    });

                    const totalLeaveDays = userLeaves.reduce((total: number, leave: Leave) => {
                      if (!leave.requestStartAt || !leave.requestEndAt) return total;
                      const start = new Date(leave.requestStartAt);
                      const end = new Date(leave.requestEndAt);
                      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                      const diffTime = endDay.getTime() - startDay.getTime();
                      const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24))) + 1;
                      return total + diffDays;
                    }, 0);

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.user.fullName}</TableCell>
                        <TableCell>{member.user.email}</TableCell>
                        <TableCell>{member.user.githubUsername ? `@${member.user.githubUsername}` : "—"}</TableCell>
                        <TableCell>{member.team?.name ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <Badge variant={member.consentStatus === "ACCEPTED" ? "success" : "warning"}>
                            {member.consentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{totalLeaveDays} day{totalLeaveDays === 1 ? "" : "s"} leave</span>
                            {isOnLeaveNow ? (
                              <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                On Leave
                              </Badge>
                            ) : (
                              <Badge variant="success">
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/activity/${member.userId}`}>Open activity</Link>
                          </Button>
                          <RemoveEmployeeButton memberId={member.id} memberName={member.user.fullName} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Pagination */}
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      <div className="flex justify-center items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => handlePageChange(page - 1)}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {page} of {totalPages || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => handlePageChange(page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
