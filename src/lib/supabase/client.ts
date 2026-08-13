import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/** Browser Supabase client — uses the publishable key, safe to bundle client-side. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
