import { createClient } from '@/lib/supabase/server';
import EventsClient from '@/components/admin/EventsClient';

export const metadata = { title: 'Admin — Events — ThesisIT' };

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, type, user_id, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-xl font-heading font-bold text-ink-primary mb-1">Events</h1>
      <p className="text-sm text-ink-muted mb-6">Most recent 50 events, filterable by type.</p>

      <EventsClient
        events={(events ?? []).map((e) => ({ ...e, meta: (e.meta as Record<string, unknown>) ?? {} }))}
      />
    </div>
  );
}
