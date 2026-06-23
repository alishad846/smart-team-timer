"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Users, ShieldAlert, Check } from "lucide-react";

type UserOption = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

type TeamMemberItem = {
  id: string;
  userId: string;
  role: string;
  user: UserOption;
};

type TeamItem = {
  id: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  leader: UserOption | null;
  members: TeamMemberItem[];
};

type MemberItem = {
  id: string;
  userId: string;
  role: string;
  status: string;
  consentStatus: string;
  user: UserOption;
  team: {
    id: string;
    name: string;
  } | null;
};

type TeamsClientProps = {
  initialTeams: TeamItem[];
  initialMembers: MemberItem[];
  organizationId: string;
};

export function TeamsClient({ initialTeams, initialMembers, organizationId }: TeamsClientProps) {
  const router = useRouter();
  
  // Local state
  const [teams, setTeams] = useState<TeamItem[]>(initialTeams);
  const [members, setMembers] = useState<MemberItem[]>(initialMembers);
  
  // Create Team state
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");

  // Loading indicator states for instant operations
  const [updatingTeamId, setUpdatingTeamId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Eligible leaders: non-removed employees/interns/managers in organization
  const eligibleLeaders = members
    .filter((m) => m.status !== "REMOVED")
    .map((m) => m.user);

  async function handleCreateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingCreate(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          organizationId,
          name: name.trim(),
          description: description.trim(),
          leaderId: leaderId || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create team");
      }

      setCreateSuccess(`Team "${data.team.name}" created successfully.`);
      setName("");
      setDescription("");
      setLeaderId("");
      
      // Update local state and refresh
      setTeams((prev) => [data.team, ...prev]);
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create team");
    } finally {
      setLoadingCreate(false);
    }
  }

  async function handleLeaderChange(teamId: string, newLeaderId: string) {
    setUpdatingTeamId(teamId);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          leaderId: newLeaderId || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update team lead");
      }

      // Update local state
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, leaderId: data.team.leaderId, leader: data.team.leader } : t))
      );
      
      setActionMessage(`Team lead updated to ${data.team.leader?.fullName ?? "None"} successfully.`);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update team lead");
    } finally {
      setUpdatingTeamId(null);
    }
  }

  async function handleMemberTeamChange(memberId: string, newTeamId: string) {
    setUpdatingMemberId(memberId);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch("/api/members", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          memberId,
          teamId: newTeamId || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to assign team");
      }

      // Update local members state
      const targetTeam = newTeamId ? teams.find((t) => t.id === newTeamId) : null;
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, team: targetTeam ? { id: targetTeam.id, name: targetTeam.name } : null }
            : m
        )
      );

      // Re-fetch or locally reconstruct teams' members list
      setTeams((prevTeams) =>
        prevTeams.map((t) => {
          // Remove member from all other teams
          const filteredMembers = t.members.filter((m) => m.id !== memberId);
          // If this is the new team, add the member
          if (t.id === newTeamId) {
            const updatedMember = members.find((m) => m.id === memberId);
            if (updatedMember) {
              const newTeamMemberItem: TeamMemberItem = {
                id: updatedMember.id,
                userId: updatedMember.userId,
                role: updatedMember.role,
                user: updatedMember.user
              };
              return { ...t, members: [...filteredMembers, newTeamMemberItem] };
            }
          }
          return { ...t, members: filteredMembers };
        })
      );

      setActionMessage("Employee team assignment updated successfully.");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not assign team");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Workspace layout"
        title="Manage Teams & Leads"
        description="Create teams, assign team leads instantly, and move interns or employees between teams."
      />

      {/* Quick alert notifications */}
      {actionError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      ) : null}
      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        
        {/* Left Side: Create Team and Team Cards Grid */}
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team name</Label>
                    <Input
                      id="teamName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Engineering, Design, Marketing..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamLead">Choose Team Lead (Optional)</Label>
                    <Select
                      id="teamLead"
                      value={leaderId}
                      onChange={(e) => setLeaderId(e.target.value)}
                    >
                      <option value="">No Team Lead selected</option>
                      {eligibleLeaders.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.role.toLowerCase()})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamDesc">Description</Label>
                  <Textarea
                    id="teamDesc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of this team's goals..."
                    rows={2}
                  />
                </div>

                {createError ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {createError}
                  </div>
                ) : null}
                {createSuccess ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                    {createSuccess}
                  </div>
                ) : null}

                <Button type="submit" disabled={loadingCreate}>
                  {loadingCreate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Team"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Teams listing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Teams ({teams.length})
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map((team) => (
                <Card key={team.id} className="border-border/70 flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{team.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {team.description || "No description provided."}
                        </p>
                      </div>
                      {updatingTeamId === team.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Team Lead</Label>
                      <Select
                        value={team.leaderId ?? ""}
                        onChange={(e) => handleLeaderChange(team.id, e.target.value)}
                        disabled={updatingTeamId === team.id}
                        className="h-9 text-xs"
                      >
                        <option value="">Assign team lead</option>
                        {eligibleLeaders.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex justify-between">
                        <span>Members</span>
                        <span>{team.members.length} member{team.members.length === 1 ? "" : "s"}</span>
                      </Label>
                      <div className="border border-border/50 rounded-xl p-2 bg-muted/30 max-h-40 overflow-y-auto space-y-1">
                        {team.members.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-1 text-center">No members assigned yet.</p>
                        ) : (
                          team.members.map((m) => (
                            <div key={m.id} className="flex justify-between items-center text-xs px-2 py-1 rounded bg-background border border-border/40">
                              <span className="font-medium truncate">{m.user.fullName}</span>
                              <Badge variant="secondary" className="scale-90 select-none text-[10px]">
                                {m.role.toLowerCase()}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Member Directory Team Assignment Panel */}
        <div>
          <Card className="border-border/70 h-full">
            <CardHeader>
              <CardTitle>Member Team Assignment</CardTitle>
              <p className="text-xs text-muted-foreground">
                Instantly assign or move employees/interns between teams.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Current Team</TableHead>
                    <TableHead className="w-[180px]">Change Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.filter((m) => m.status !== "REMOVED").map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="py-3">
                        <div className="font-medium text-sm">{member.user.fullName}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {member.role} • {member.user.email}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {member.team ? (
                          <Badge variant="success" className="text-xs">
                            {member.team.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.team?.id ?? ""}
                            onChange={(e) => handleMemberTeamChange(member.id, e.target.value)}
                            disabled={updatingMemberId === member.id}
                            className="h-8 py-1 text-xs"
                          >
                            <option value="">Unassigned</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </Select>
                          {updatingMemberId === member.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
