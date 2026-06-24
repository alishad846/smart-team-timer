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
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      if (mode === "register") {
        formData.append("fullName", fullName);
        const { registerAction } = await import("@/app/auth/actions");
        const result = await registerAction(formData);
        
        if (result?.error) throw new Error(result.error);
        if (result?.message) {
          setError(result.message);
          return;
        }
      } else {
        const { loginAction } = await import("@/app/auth/actions");
        const result = await loginAction(formData);
        
        if (result?.error) throw new Error(result.error);
      }

      // Navigate to the target page without adding to history
      router.replace(next as any);
      // Refresh to ensure any server side data is revalidated
      router.refresh();
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
