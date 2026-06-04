import { formatDuration } from "@/lib/utils";

export type ProductivityInsight = {
  title: string;
  description: string;
  severity: "good" | "warning" | "info";
};

export function buildAiSummary(input: {
  productiveMinutes: number;
  idleMinutes: number;
  focusSessions: number;
  appSwitches: number;
  lowActivityWindows: string[];
}) {
  const productivityScore = Math.max(
    0,
    Math.min(100, Math.round((input.productiveMinutes / Math.max(input.productiveMinutes + input.idleMinutes, 1)) * 100))
  );

  const insights: ProductivityInsight[] = [
    {
      title: "Daily summary",
      description: `You logged ${formatDuration(input.productiveMinutes)} of productive time with a ${productivityScore}% productivity score.`,
      severity: "good"
    }
  ];

  if (input.idleMinutes > input.productiveMinutes * 0.2) {
    insights.push({
      title: "Low activity window",
      description: `Idle time is elevated. The quietest period appears to be ${input.lowActivityWindows[0] ?? "mid-afternoon"}.`,
      severity: "warning"
    });
  }

  if (input.appSwitches > 20) {
    insights.push({
      title: "Context switching",
      description: "Frequent app switching may be fragmenting deep work. Try batching communication windows.",
      severity: "info"
    });
  }

  if (input.focusSessions < 4) {
    insights.push({
      title: "Focus opportunity",
      description: "A few more protected focus blocks would help stabilize productivity across the day.",
      severity: "info"
    });
  }

  return {
    score: productivityScore,
    summary:
      input.lowActivityWindows.length > 0
        ? `You logged ${formatDuration(input.productiveMinutes)} of productive time. The quietest window appears around ${input.lowActivityWindows[0]}, so a protected focus block there could improve consistency.`
        : `You logged ${formatDuration(input.productiveMinutes)} of productive time with a ${productivityScore}% productivity score. Keep batching tasks and reducing context switching to maintain momentum.`,
    insights
  };
}
