import Link from "next/link";
import { ArrowRight, BarChart3, Clock3, ShieldCheck, Smartphone, Sparkles, LayoutDashboard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const featureCards = [
  {
    title: "Live timer tracking",
    description: "Start, stop, and pause work sessions effortlessly with seamless project-aware timers.",
    icon: Clock3
  },
  {
    title: "Activity monitoring",
    description: "Gain insights into app usage, focus sessions, and active website activity.",
    icon: Smartphone
  },
  {
    title: "Manager analytics",
    description: "Review productivity scores, weekly trends, and actionable reports at a glance.",
    icon: BarChart3
  },
  {
    title: "Privacy-first controls",
    description: "Built with transparent tracking, strict consent settings, and user privacy in mind.",
    icon: ShieldCheck
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black overflow-hidden relative selection:bg-primary/30">
      {/* Abstract Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
      
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10 relative z-10">
        
        {/* Navigation */}
        <header className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-lg shadow-sky-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-bold text-white tracking-tight">SmartTeamTimer</p>
              <p className="text-xs text-slate-400 font-medium">Modern team productivity</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Button asChild className="hidden md:inline-flex bg-white text-black hover:bg-slate-200 rounded-full px-6 font-semibold shadow-xl shadow-white/10 transition-all hover:scale-105 duration-300">
              <Link href="/auth/register">Create workspace</Link>
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center flex-1 text-center mt-20 mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-both">
          <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300 px-4 py-1.5 rounded-full backdrop-blur-md mb-8 text-xs font-medium uppercase tracking-widest">
            The next generation of team management
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 max-w-5xl leading-tight">
            Track productivity. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">Maintain trust.</span>
          </h1>
          
          <p className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-slate-400 font-medium">
            A seamless productivity platform that gives managers the clarity they need, and employees the autonomy they deserve.
          </p>
          
          <div className="mt-12 flex items-center justify-center w-full">
            <Button asChild size="lg" className="h-14 px-8 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/25 border-0 text-base font-semibold transition-all hover:scale-105 duration-300 w-full sm:w-auto group">
              <Link href="/auth/login">
                Continue to login
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 pb-20 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title} 
                className="group border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-500 overflow-hidden relative border-t-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8 relative z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-400 mb-6 group-hover:scale-110 group-hover:text-emerald-400 transition-all duration-500 shadow-inner border border-white/5">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-white tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400 font-medium">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>
        
      </div>
    </main>
  );
}
