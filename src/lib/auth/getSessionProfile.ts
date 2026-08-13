import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/supabase/database.types';

export interface SessionProfile {
  id: string;
  email: string;
  role: Enums<'app_role'>;
  fullName: string | null;
}

/**
 * Server-only helper: current signed-in user's profile, or null if signed
 * out. Used by layouts/pages that need to know "who is this" without each
 * one re-deriving the same two-step (auth.getUser -> profiles select) query.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return { id: user.id, email: profile.email, role: profile.role, fullName: profile.full_name };
}
