import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Service-role client — bypasses RLS entirely. Server-only, never import
 * from a Client Component or anything that ships to the browser bundle
 * (the `server-only` import above makes that a build error, not just a
 * convention).
 *
 * Use for: server-side event logging (lib/server/logEvent.ts), admin usage
 * rollups. Never use to serve a student's own request — those go through
 * lib/supabase/server.ts so RLS stays the enforcement boundary.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
