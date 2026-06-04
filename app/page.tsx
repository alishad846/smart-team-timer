import Link from "next/link";
import { ArrowRight, BarChart3, Clock3, ShieldCheck, Smartphone, Sparkles, Users2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const featureCards = [
  {
    title: "Live timer tracking",
    description: "Start, stop, and pause work sessions with project-aware timers.",
    icon: Clock3
  },
  {
    title: "Activity monitoring",
    description: "Monitor app usage, focus sessions, idle time, and website activity.",
    icon: Smartphone
  },
  {
    title: "Manager analytics",
    description: "View productivity scores, weekly trends, screenshots, and reports.",
    icon: BarChart3
  },
  {
    title: "Privacy-first controls",
    description: "Consent settings, transparent tracking, and selective screenshot capture.",
    icon: ShieldCheck
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-hero-grid">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">SmartTeamTimer</p>
              <p className="text-xs text-muted-foreground">Productivity operations for modern teams</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login?next=/employee/workspace"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild className="hidden md:inline-flex">
              <Link href="/auth/register">Create workspace</Link>
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-16 py-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="w-fit">
              MVP-ready team productivity platform
            </Badge>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Track productivity without losing trust.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              SmartTeamTimer gives managers a clear view of time tracking, activity, projects, screenshots, and
              weekly trends, while giving employees a fast timer, personal analytics, and transparent consent controls.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/auth/login?next=/employee/workspace" className="inline-flex items-center gap-2">
                  Employee sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Link href="/auth/login?next=/admin">Admin sign in</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Users2 className="h-4 w-4 text-sky-300" />
                    Employee workspace
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Start your timer, choose a task, see your daily analytics, and request help when something is blocked.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Shield className="h-4 w-4 text-emerald-300" />
                    Admin console
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Create employees, broadcast updates, inspect activity bursts, and review weekly productivity.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Tracked hours", value: "1.2k+" },
                { label: "Team members", value: "28" },
                { label: "Avg. productivity", value: "86%" }
              ].map((item) => (
                <Card key={item.label} className="border-white/10 bg-white/5 backdrop-blur">
                  <CardContent className="p-5">
                    <div className="text-2xl font-semibold text-white">{item.value}</div>
                    <p className="mt-1 text-sm text-slate-300">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-border/70 bg-card/95 shadow-2xl shadow-sky-950/30">
            <CardHeader>
              <CardTitle>Productivity command center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Focus score</span>
                  <span className="text-sm font-medium text-emerald-500">+8% this week</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border-border bg-background/80">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Admin alerts</p>
                    <p className="mt-2 text-2xl font-semibold">Broadcast ready</p>
                  </CardContent>
                </Card>
                <Card className="border-border bg-background/80">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Employee timer</p>
                    <p className="mt-2 text-2xl font-semibold">Live sync</p>
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-sm font-medium">AI summary</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Low activity detected after lunch. Recommend a 45-minute focus block before the daily stand-up.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4 py-10 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/70 bg-card/90 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </section>
    </main>
  );
}
