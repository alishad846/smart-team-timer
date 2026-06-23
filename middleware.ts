import { NextRequest, NextResponse } from "next/server";
// Avoid importing @supabase/ssr here — it pulls in browser-targeted code
// that causes "self is not defined" during Next.js dev middleware bundling.

const protectedRoutes = ["/dashboard", "/admin", "/employee"];
const authRoutes = ["/auth/login", "/auth/register"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  // Lightweight auth presence check: avoid invoking Supabase server helpers in middleware
  // which may pull in browser globals. We simply detect an auth cookie here and
  // let higher-level server code validate the session when needed.
  const authCookieNames = [
    "sb-access-token",
    "sb:token",
    "supabase-auth-token",
    "supabase-session"
  ];

  const hasAuthCookie = request.cookies.getAll().some((cookie) => {
    return (
      (cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")) ||
      authCookieNames.includes(cookie.name)
    );
  });

  const user = hasAuthCookie ? {} : null;

  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isAuthPage = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/employee/:path*", "/auth/:path*"]
};
