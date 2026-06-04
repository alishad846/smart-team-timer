export type TimeEntryTotals = {
  totalTrackedHours: number;
  productiveMinutes: number;
  idleMinutes: number;
  productivityScore: number;
};

export function summarizeTimeEntries(
  timeEntries: { totalSeconds: number; productiveSeconds: number; idleSeconds: number }[]
): TimeEntryTotals {
  const totalTrackedSeconds = timeEntries.reduce((sum, entry) => sum + entry.totalSeconds, 0);
  const productiveSeconds = timeEntries.reduce((sum, entry) => sum + entry.productiveSeconds, 0);
  const idleSeconds = timeEntries.reduce((sum, entry) => sum + entry.idleSeconds, 0);
  const productivityScore =
    productiveSeconds + idleSeconds > 0
      ? Math.round((productiveSeconds / Math.max(productiveSeconds + idleSeconds, 1)) * 100)
      : 0;

  return {
    totalTrackedHours: totalTrackedSeconds / 3600,
    productiveMinutes: productiveSeconds / 60,
    idleMinutes: idleSeconds / 60,
    productivityScore
  };
}

