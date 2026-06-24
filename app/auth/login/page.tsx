import { createServerSupabase } from "@/lib/supabase/server";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/90 p-8 shadow-2xl shadow-primary/10 backdrop-blur-xl">
            <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
            <div className="mt-6 h-8 w-3/4 animate-pulse rounded-xl bg-muted" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-xl bg-muted" />
            <div className="mt-8 space-y-4">
              <div className="h-11 animate-pulse rounded-xl bg-muted" />
              <div className="h-11 animate-pulse rounded-xl bg-muted" />
              <div className="h-11 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        }
      >
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
