"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
