import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  accent?: string;
  helper?: string;
};

export function StatCard({ label, value, delta, accent = "from-sky-500/20 to-cyan-500/5", helper }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/90 backdrop-blur">
      <CardContent className="p-0">
        <div className={cn("h-1.5 bg-gradient-to-r", accent)} />
        <div className="p-6">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="text-3xl font-semibold tracking-tight">{value}</div>
            {delta ? <div className="text-sm font-medium text-emerald-500">{delta}</div> : null}
          </div>
          {helper ? <p className="mt-3 text-sm text-muted-foreground">{helper}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
