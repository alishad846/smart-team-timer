"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RemoveEmployeeButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm(`Are you sure you want to remove ${memberName}? They will no longer have access to this workspace.`)) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, status: "REMOVED" })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Could not remove employee");
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error removing employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleRemove} disabled={loading}>
      {loading ? "Removing..." : "Remove"}
    </Button>
  );
}
