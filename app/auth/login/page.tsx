"use client";

import dynamic from "next/dynamic";

// Dynamically import AuthForm with a lightweight fallback UI
const AuthForm = dynamic(() => import("@/components/auth/auth-form"), {
  loading: () => (
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
  ),
  ssr: false,
});

export const dynamic = "force-dynamic";
export const revalidate = 0; // no caching for login page

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <AuthForm mode="login" />
    </main>
  );
}
