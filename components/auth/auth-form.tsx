"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          setError("Check your email to confirm the account, then sign in.");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          const isInvalidCredentials = signInError.message.toLowerCase().includes("invalid login credentials");

          if (isInvalidCredentials) {
            const bootstrapResponse = await fetch("/api/auth/bootstrap-admin", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ email, password })
            });

            if (bootstrapResponse.ok) {
              router.push(next as any);
              router.refresh();
              return;
            }

            const payload = (await bootstrapResponse.json().catch(() => null)) as
              | { error?: string }
              | null;

            if (payload?.error) {
              throw new Error(payload.error);
            }
          }

          throw signInError;
        }
      }

      router.push(next as any);
      router.refresh();
      if (typeof window !== 'undefined') {
        window.location.href = next as string;
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md border-border/70 bg-card/90 backdrop-blur-xl">
      <CardHeader className="space-y-4">
        <Badge variant="secondary" className="w-fit">
          Secure access
        </Badge>
        <div>
          <CardTitle className="text-2xl">
            {mode === "login" ? "Welcome back" : "Create your workspace"}
          </CardTitle>
          <CardDescription className="mt-2">
            Track productivity, activity, screenshots, and project progress in one place.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" ? (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                placeholder="Aarav Singh"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="manager@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <Link
            href={mode === "login" ? "/auth/register" : "/auth/login"}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {mode === "login" ? "Register" : "Sign in"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
