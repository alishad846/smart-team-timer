import { createAdminSupabase } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    const { session } = data ?? {};
    const response = NextResponse.json({ ok: true });
    if (session?.access_token) {
      // Forward the Supabase access token as an HttpOnly cookie so middleware can read it
      response.cookies.set('sb-access-token', session.access_token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
      });
    }
    return response;
  } catch (e: any) {
    console.error('[bootstrap-admin] error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal server error' }, { status: 500 });
  }
}
