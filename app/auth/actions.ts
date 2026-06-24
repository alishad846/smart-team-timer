"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function createActionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {}
        },
      },
    }
  );
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createActionClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const isInvalidCredentials = error.message.toLowerCase().includes("invalid login credentials");
    if (isInvalidCredentials) {
      const adminClient = createAdminSupabase();
      const { data: adminData, error: adminError } = await adminClient.auth.signInWithPassword({
        email,
        password,
      });
      if (!adminError && adminData.session) {
        await supabase.auth.setSession({
          access_token: adminData.session.access_token,
          refresh_token: adminData.session.refresh_token,
        });
        return { success: true };
      }
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  const supabase = await createActionClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { message: "Check your email to confirm the account, then sign in." };
  }

  return { success: true };
}

export async function logoutAction() {
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  return { success: true };
}
