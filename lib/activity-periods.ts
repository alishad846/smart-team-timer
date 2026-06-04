import {
  addMonths,
  eachDayOfInterval,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { summarizeTimeEntries } from "@/lib/time-metrics";

export type ActivityPeriod = "daily" | "weekly" | "monthly";

export type MonthWeekFilter = "all" | "week1" | "week2" | "week3" | "week4";

export type ActivityBucket = {
  day: string;
  date?: string;
  productive: number;
  idle: number;
};

export type ActivitySnapshot = {
  period: ActivityPeriod;
  label: string;
  rangeStart: Date;
  rangeEnd: Date;
  buckets: ActivityBucket[];
  totalTrackedHours: number;
  productiveMinutes: number;
  idleMinutes: number;
  productivityScore: number;
  creditsEarned: number;
  creditTarget: number;
  streakDays: number;
};

export const CREDIT_TARGETS: Record<ActivityPeriod, number> = {
  daily: 3,
  weekly: 72,
  monthly: 280
};

export function normalizeActivityPeriod(value: string | string[] | undefined): ActivityPeriod {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === "daily" || raw === "weekly" || raw === "monthly") {
    return raw;
  }

  return "weekly";
}

export function normalizeMonthWeekFilter(value: string | string[] | undefined): MonthWeekFilter {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === "week1" || raw === "week2" || raw === "week3" || raw === "week4") {
    return raw;
  }

  return "all";
}

export function getMonthWeekLabel(filter: MonthWeekFilter) {
  if (filter === "week1") return "Week 1";
  if (filter === "week2") return "Week 2";
  if (filter === "week3") return "Week 3";
  if (filter === "week4") return "Week 4";
  return "All month";
}

export function getCurrentMonthWeekFilter(now = new Date()): Exclude<MonthWeekFilter, "all"> {
  const day = now.getDate();

  if (day <= 7) return "week1";
  if (day <= 14) return "week2";
  if (day <= 21) return "week3";
  return "week4";
}

export function getMonthWeekRange(filter: MonthWeekFilter, now = new Date()) {
  const monthStart = startOfMonth(now);

  if (filter === "week1") {
    return { start: monthStart, end: endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth(), 7)) };
  }

  if (filter === "week2") {
    return { start: new Date(monthStart.getFullYear(), monthStart.getMonth(), 8), end: endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth(), 14)) };
  }

  if (filter === "week3") {
    return { start: new Date(monthStart.getFullYear(), monthStart.getMonth(), 15), end: endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth(), 21)) };
  }

  if (filter === "week4") {
    return { start: new Date(monthStart.getFullYear(), monthStart.getMonth(), 22), end: endOfMonth(now) };
  }

  return { start: monthStart, end: endOfMonth(now) };
}

export function getActivityPeriodLabel(period: ActivityPeriod) {
  if (period === "daily") {
    return "Today";
  }

  if (period === "weekly") {
    return "This week";
  }

  return "Last 6 months";
}

export function getActivityPeriodRange(period: ActivityPeriod, now = new Date()) {
  if (period === "daily") {
    return { start: startOfDay(now), end: now };
  }

  if (period === "weekly") {
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now };
  }

  return { start: startOfMonth(subMonths(now, 5)), end: now };
}

function buildDailyBuckets(timeEntries: { startedAt: Date; productiveSeconds: number; idleSeconds: number }[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    day: `${String(hour).padStart(2, "0")}:00`,
    productive: 0,
    idle: 0
  }));

  for (const entry of timeEntries) {
    const hour = entry.startedAt.getHours();
    const bucket = buckets[hour];
    bucket.productive += entry.productiveSeconds / 3600;
    bucket.idle += entry.idleSeconds / 3600;
  }

  return buckets.map((bucket) => ({
    day: bucket.day,
    productive: Number(bucket.productive.toFixed(1)),
    idle: Number(bucket.idle.toFixed(1))
  }));
}

function buildDateBuckets(
  timeEntries: { startedAt: Date; productiveSeconds: number; idleSeconds: number }[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  const days = eachDayOfInterval({ start, end });
  const buckets = days.map((day) => ({
    day: format(day, "EEE"),
    date: format(day, "MMM d"),
    productive: 0,
    idle: 0
  }));

  for (const entry of timeEntries) {
    const dayIndex = differenceInCalendarDays(startOfDay(entry.startedAt), start);
    if (dayIndex < 0 || dayIndex >= buckets.length) {
      continue;
    }

    const bucket = buckets[dayIndex];
    bucket.productive += entry.productiveSeconds / 3600;
    bucket.idle += entry.idleSeconds / 3600;
  }

  return buckets.map((bucket) => ({
    day: bucket.day,
    date: bucket.date,
    productive: Number(bucket.productive.toFixed(1)),
    idle: Number(bucket.idle.toFixed(1))
  }));
}

function buildMonthlyBuckets(timeEntries: { startedAt: Date; productiveSeconds: number; idleSeconds: number }[], now: Date) {
  const monthStart = startOfMonth(subMonths(now, 5));
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const month = addMonths(monthStart, index);
    return {
      day: format(month, "MMM yyyy"),
      productive: 0,
      idle: 0
    };
  });

  for (const entry of timeEntries) {
    const monthIndex = differenceInCalendarMonths(entry.startedAt, monthStart);
    if (monthIndex < 0 || monthIndex >= buckets.length) {
      continue;
    }

    const bucket = buckets[monthIndex];
    bucket.productive += entry.productiveSeconds / 3600;
    bucket.idle += entry.idleSeconds / 3600;
  }

  return buckets.map((bucket) => ({
    day: bucket.day,
    productive: Number(bucket.productive.toFixed(1)),
    idle: Number(bucket.idle.toFixed(1))
  }));
}

export function buildActivitySeries(
  timeEntries: { startedAt: Date; productiveSeconds: number; idleSeconds: number }[],
  period: ActivityPeriod,
  now = new Date(),
  rangeStart?: Date,
  rangeEnd?: Date
) {
  if (period === "daily") {
    return buildDailyBuckets(timeEntries);
  }

  if (period === "monthly") {
    return buildMonthlyBuckets(timeEntries, now);
  }

  return buildDateBuckets(timeEntries, rangeStart ?? startOfWeek(now, { weekStartsOn: 1 }), rangeEnd ?? now);
}

export type ActivitySnapshotOptions = {
  label?: string;
  rangeStart?: Date;
  rangeEnd?: Date;
  bucketPeriod?: ActivityPeriod;
  creditTarget?: number;
};

export function buildActivitySnapshot(
  timeEntries: { startedAt: Date; productiveSeconds: number; idleSeconds: number }[],
  period: ActivityPeriod,
  now = new Date(),
  options: ActivitySnapshotOptions = {}
): ActivitySnapshot {
  const label = options.label ?? getActivityPeriodLabel(period);
  const rangeStart = options.rangeStart ?? getActivityPeriodRange(period, now).start;
  const rangeEnd = options.rangeEnd ?? now;
  const bucketPeriod = options.bucketPeriod ?? period;
  const creditTarget = options.creditTarget ?? CREDIT_TARGETS[period];
  const totals = summarizeTimeEntries(
    timeEntries.map((entry) => ({
      totalSeconds: entry.productiveSeconds + entry.idleSeconds,
      productiveSeconds: entry.productiveSeconds,
      idleSeconds: entry.idleSeconds
    }))
  );
  const creditsEarned = Number((totals.productiveMinutes / 20).toFixed(1));
  const bucketsByDay = new Map<string, { productiveSeconds: number; idleSeconds: number }>();

  for (const entry of timeEntries) {
    const key = format(entry.startedAt, "yyyy-MM-dd");
    const current = bucketsByDay.get(key) ?? { productiveSeconds: 0, idleSeconds: 0 };
    current.productiveSeconds += entry.productiveSeconds;
    current.idleSeconds += entry.idleSeconds;
    bucketsByDay.set(key, current);
  }

  let streakDays = 0;
  for (let index = 0; index < 90; index += 1) {
    const day = subDays(startOfDay(rangeEnd), index);
    const key = format(day, "yyyy-MM-dd");
    const bucket = bucketsByDay.get(key);

    if (!bucket) {
      if (index === 0) {
        continue;
      }
      break;
    }

    const productiveMinutes = bucket.productiveSeconds / 60;
    const dayCredits = productiveMinutes / 20;

    if (dayCredits >= 3) {
      streakDays += 1;
    } else {
      break;
    }
  }

  return {
    period,
    label,
    rangeStart,
    rangeEnd,
    buckets: buildActivitySeries(timeEntries, bucketPeriod, now, rangeStart, rangeEnd),
    totalTrackedHours: totals.totalTrackedHours,
    productiveMinutes: totals.productiveMinutes,
    idleMinutes: totals.idleMinutes,
    productivityScore: totals.productivityScore,
    creditsEarned,
    creditTarget,
    streakDays
  };
}
