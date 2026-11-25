"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePaginatedData } from "@/lib/data-fetch";

interface Member {
  id: string;
  name: string;
  team: string;
  githubUsername: string;
  score: number;
  consentStatus: string;
}

interface Screenshot {
  id: string;
  user: { fullName: string };
  activeApp: string | null;
  activeWindow: string | null;
  capturedAt: string;
}

interface AdminActivityResponse {
  members: Member[];
  totalMembers: number;
  page: number;
  size: number;
  totalPages: number;
  totalTrackedHours: number;
  productiveMinutes: number;
  idleMinutes: number;
  productivityScore: number;
  lowActivityCount: number;
  screenshots: Screenshot[];
}

export default function AdminActivityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const size = Math.min(Number(searchParams.get("size")) || 20, 50);

  const { data: members, loading: membersLoading, error: membersError, refetch: refetchMembers } = usePaginatedData<Member>(
    "/api/admin/activity",
    page,
    size,
    { ttl: 5 * 60 * 1000 }
  );

  const [stats, setStats] = useState<AdminActivityResponse | null>(null);
  const [staticLoading, setStaticLoading] = useState(true);
  const [staticError, setStaticError] = useState<Error | null>(null);

  // Fetch static data (stats, screenshots) once
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        setStaticLoading(true);
        const response = await fetch("/api/admin/activity");
        if (response.ok) {
          const result: AdminActivityResponse = await response.json();
          setStats(result);
        }
      } catch (err) {
        setStaticError(err instanceof Error ? err : new Error("Failed to load data"));
      } finally {
        setStaticLoading(false);
      }
    };

    fetchStaticData();
  }, []);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/admin/activity?${params.toString()}`);
  };

  if (staticLoading && !stats) {
    return (
      <>
        <PageHeader
          badge="Activity monitoring"
          title="Admin Activity Dashboard"
          description="Open a person's detail page to review their time entries, screenshots, and app usage."
        />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (staticError) {
    return (
      <>
        <PageHeader
          badge="Activity monitoring"
          title="Admin Activity Dashboard"
          description="Open a person's detail page to review their time entries, screenshots, and app usage."
        />
        <Card className="border-border/70">
          <CardContent className="py-8 text-center text-destructive">
            Failed to load data. <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const membersResult = members || [];
  const totalMembers = stats?.totalMembers || 0;
  const totalPages = stats?.totalPages || 1;
  const totalTrackedHours = stats?.totalTrackedHours || 0;
  const productiveMinutes = stats?.productiveMinutes || 0;
  const idleMinutes = stats?.idleMinutes || 0;
  const productivityScore = stats?.productivityScore || 0;
  const lowActivityCount = stats?.lowActivityCount || 0;
  const screenshots = stats?.screenshots || [];

  return (
    <>
      <PageHeader
        badge="Activity monitoring"
        title="Admin Activity Dashboard"
        description="Open a person's detail page to review their time entries, screenshots, and app usage."
      />
      <section className="grid gap-4 lg:grid-cols-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalTrackedHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{productivityScore}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Idle minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{Math.round(idleMinutes)}m</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Focus minutes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{Math.round(productiveMinutes)}m</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 mt-6">
        <CardHeader>
          <CardTitle>Idle threshold</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{lowActivityCount > 0 ? `${lowActivityCount} activity windows crossed the 15‑minute idle threshold in the last 24 hours.` : "No activity windows crossed the 15‑minute idle threshold in the last 24 hours."}</p>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2 mt-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Employee activity directory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>GitHub</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading && membersResult.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : membersError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-destructive">
                      Failed to load employees. <Button variant="outline" size="sm" onClick={refetchMembers}>Retry</Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {membersResult.map((member: Member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.githubUsername ? `@${member.githubUsername}` : "-"}</TableCell>
                        <TableCell>{member.team}</TableCell>
                        <TableCell>{member.score}%</TableCell>
                        <TableCell>
                          <Badge variant={member.consentStatus === "ACCEPTED" ? "success" : "warning"}>{member.consentStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/activity/${member.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {membersResult.length === 0 && !membersLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No employees found</TableCell>
                      </TableRow>
                    )}
                    {/* Pagination */}
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
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
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Recent evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              {screenshots.map((shot: Screenshot) => (
                <div key={shot.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="font-medium">{shot.user.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {shot.activeApp || "Desktop"} - {shot.activeWindow || "No window title"}
                  </p>
                </div>
              ))}
              {screenshots.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No activity logs yet. The desktop tracker will populate this once employees grant permission and start work.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
