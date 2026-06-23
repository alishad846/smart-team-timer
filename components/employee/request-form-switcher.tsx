"use client";

import { useState } from "react";
import { SupportRequestCard } from "./support-request-card";
import { LeaveRequestCard } from "./leave-request-card";

type Props = {
  projects: { id: string; name: string }[];
  teamLeads: { id: string; fullName: string }[];
  defaultProjectId?: string;
  teamName: string;
};

export default function RequestFormSwitcher({ projects, teamLeads, defaultProjectId = "", teamName }: Props) {
  const [type, setType] = useState<"MISSED" | "LEAVE">("MISSED");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Request type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "MISSED" | "LEAVE")}
          className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
        >
          <option value="MISSED">Missed timer</option>
          <option value="LEAVE">Leave</option>
        </select>
      </div>

      {type === "MISSED" ? (
        <SupportRequestCard projects={projects} defaultProjectId={defaultProjectId} teamName={teamName} />
      ) : (
        <LeaveRequestCard projects={projects} teamLeads={teamLeads} teamName={teamName} />
      )}
    </div>
  );
}
