import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// A route handler (not a client-side supabase.auth.signOut() call) so the
// session cookie clears correctly across SSR before the redirect happens.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url));
}
