"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const heatmapPalette = [
  "bg-sky-500/10 border-sky-500/20",
  "bg-sky-500/20 border-sky-500/30",
  "bg-cyan-500/30 border-cyan-500/40",
  "bg-emerald-500/40 border-emerald-500/40",
  "bg-emerald-500/60 border-emerald-500/50"
];

type ActivityPoint = {
  day: string;
  date?: string;
  productive: number;
  idle: number;
};

function ActivityTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string; payload?: ActivityPoint } }) {
  if (typeof x !== "number" || typeof y !== "number" || !payload) {
    return null;
  }

  const day = payload.value ?? "";
  const date = payload.payload?.date ?? "";

  return (
    <g transform={`translate(${x},${y + 14})`}>
      <text textAnchor="middle" fill="currentColor" className="fill-muted-foreground text-[11px]">
        <tspan x="0" dy="0">
          {day}
        </tspan>
        {date ? (
          <tspan x="0" dy="12" className="fill-muted-foreground/80 text-[10px]">
            {date}
          </tspan>
        ) : null}
      </text>
    </g>
  );
}

type ProductivityChartProps = {
  data: ActivityPoint[];
  title?: string;
};

export function ProductivityChart({ data, title = "Daily activity" }: ProductivityChartProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="productiveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.42} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={<ActivityTick />} height={44} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as ActivityPoint | undefined;
                return item ? (item.date ? `${item.day}, ${item.date}` : item.day) : "";
              }}
            />
            <Area type="monotone" dataKey="productive" stroke="hsl(var(--primary))" fill="url(#productiveFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

type WeeklyTrendChartProps = {
  data: { week: string; productivity: number }[];
};

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Weekly trend</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.2} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="productivity" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

type FocusChartProps = {
  productiveTime: number;
  idleTime: number;
};

export function FocusChart({ productiveTime, idleTime }: FocusChartProps) {
  const data = [
    { name: "Productive", value: productiveTime, color: "hsl(var(--primary))" },
    { name: "Idle", value: idleTime, color: "#f59e0b" }
  ];

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Focus split</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

type AppUsageChartProps = {
  data: { app: string; minutes: number }[];
};

export function AppUsageChart({ data }: AppUsageChartProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Most used apps</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.2} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis dataKey="app" type="category" tickLine={false} axisLine={false} width={100} />
            <Tooltip />
            <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[0, 12, 12, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

type WebsiteUsageChartProps = {
  data: { site: string; minutes: number; visits: number }[];
};

export function WebsiteUsageChart({ data }: WebsiteUsageChartProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Most used websites</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.2} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis dataKey="site" type="category" tickLine={false} axisLine={false} width={120} />
            <Tooltip
              formatter={(value, name, props) => {
                if (name === "minutes") {
                  return [`${value} min`, "Tracked time"];
                }
                return [value, name];
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.site ?? "Website"}
            />
            <Bar dataKey="minutes" fill="#0f766e" radius={[0, 12, 12, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

type HeatmapProps = {
  data: { day: string; hour: string; value: number }[];
};

export function ActivityHeatmap({ data }: HeatmapProps) {
  const maxValue = Math.max(...data.map((entry) => entry.value), 1);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Activity heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {data.map((entry) => {
            const ratio = entry.value / maxValue;
            const toneIndex = Math.min(heatmapPalette.length - 1, Math.floor(ratio * heatmapPalette.length));
            return (
              <div
                key={`${entry.day}-${entry.hour}`}
                className={cn("rounded-2xl border p-4 text-left", heatmapPalette[toneIndex])}
              >
                <div className="text-xs text-muted-foreground">{entry.day}</div>
                <div className="mt-2 text-lg font-semibold">{entry.hour}:00</div>
                <div className="mt-2 text-sm text-muted-foreground">{entry.value} sessions</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

type SummaryCardProps = {
  title: string;
  summary: string;
  score: number;
};

export function AiSummaryCard({ title, summary, score }: SummaryCardProps) {
  return (
    <Card className="border-border/70 bg-gradient-to-br from-sky-500/10 to-emerald-500/10">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge>{score}% score</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}
