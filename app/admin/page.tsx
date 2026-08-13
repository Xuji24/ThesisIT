import { Users, MessageSquare, Activity, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import AdminOverviewClient, { type DailyModeRow } from '@/components/analytics/AdminOverviewClient';

export const metadata = { title: 'Admin Overview — ThesisIT' };

const REQUEST_EVENT_TYPES = ['session_start', 'question_asked', 'evaluation_run', 'chat_message', 'report_generated'];

async function getCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'profiles' | 'defense_sessions' | 'events',
) {
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return count ?? 0;
}

function StatTile({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-line-hairline bg-surface-card p-5">
      <div className="flex items-center gap-2 text-ink-muted mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-ink-primary tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [users, sessions, events, recentEvents, recentSessions, dauRows] = await Promise.all([
    getCount(supabase, 'profiles'),
    getCount(supabase, 'defense_sessions'),
    getCount(supabase, 'events'),
    supabase.from('events').select('type, meta, created_at').gte('created_at', since30).limit(2000),
    supabase.from('defense_sessions').select('mode, started_at').gte('started_at', since7).limit(1000),
    supabase.from('events').select('user_id').gte('created_at', todayStart.toISOString()).limit(5000),
  ]);

  const dau = new Set((dauRows.data ?? []).map((e) => e.user_id).filter(Boolean)).size;

  // ── Aggregate provider mix + cache/error rates from the last 30 days ──────
  let cacheHits = 0;
  let totalRequests = 0;
  let errors = 0;
  const providerTally = new Map<string, number>();

  for (const e of recentEvents.data ?? []) {
    const meta = (e.meta ?? {}) as Record<string, unknown>;
    if (e.type === 'error') {
      errors++;
      continue;
    }
    if (!REQUEST_EVENT_TYPES.includes(e.type)) continue;
    totalRequests++;
    if (meta.cacheHit === true) {
      cacheHits++;
    } else if (typeof meta.provider === 'string') {
      providerTally.set(meta.provider, (providerTally.get(meta.provider) ?? 0) + 1);
    }
  }
  const providerCounts = Array.from(providerTally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, value]) => ({ label, value }));

  // ── Sessions per day (last 7 days), split by mode ──────────────────────────
  const dailyMap = new Map<string, DailyModeRow>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    dailyMap.set(key, { date: key, chat: 0, voice: 0 });
  }
  for (const s of recentSessions.data ?? []) {
    const key = new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const row = dailyMap.get(key);
    if (row) row[s.mode as 'chat' | 'voice']++;
  }

  return (
    <div>
      <h1 className="text-xl font-heading font-bold text-ink-primary mb-1">Overview</h1>
      <p className="text-sm text-ink-muted mb-6">Usage across every account on ThesisIT.</p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatTile label="Users" value={users} icon={Users} />
        <StatTile label="Active today" value={dau} icon={UserCheck} />
        <StatTile label="Defense sessions" value={sessions} icon={MessageSquare} />
        <StatTile label="Logged events" value={events} icon={Activity} />
      </div>

      {events === 0 ? (
        <p className="mt-6 text-xs text-ink-muted">
          No events logged yet — usage will appear here once students start using the app
          signed in.
        </p>
      ) : (
        <AdminOverviewClient
          dailyModeRows={Array.from(dailyMap.values())}
          providerCounts={providerCounts}
          cacheHits={cacheHits}
          totalRequests={totalRequests}
          errors={errors}
        />
      )}
    </div>
  );
}
