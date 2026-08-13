import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import AnalyticsClient, { type AnalyticsSessionRow } from '@/components/analytics/AnalyticsClient';

export const metadata = { title: 'Analytics — ThesisIT' };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/analytics');
  }

  const { data: sessions, count } = await supabase
    .from('defense_sessions')
    .select('id, started_at, mode, difficulty, overall_score, grade, criteria, questions_answered', {
      count: 'exact',
    })
    .order('started_at', { ascending: false })
    .limit(100);

  const rows: AnalyticsSessionRow[] = (sessions ?? []).map((s) => ({
    id: s.id,
    started_at: s.started_at,
    mode: s.mode,
    difficulty: s.difficulty,
    overall_score: s.overall_score,
    grade: s.grade,
    criteria: (s.criteria as Record<string, number>) ?? {},
    questions_answered: s.questions_answered,
  }));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-ink-primary flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-accent" strokeWidth={2} />
          Performance Analytics
        </h1>
        <p className="mt-2 text-sm text-ink-muted max-w-lg">
          Trends across your mock defense sessions — criterion scores, per-question
          breakdowns, and readiness over time.
        </p>
      </div>

      {(count ?? 0) > 0 ? (
        <AnalyticsClient sessions={rows} />
      ) : (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface-card p-10 text-center">
          <BarChart3 className="w-8 h-8 text-ink-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-ink-primary">No sessions yet</p>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            Run a mock defense from the workspace and your performance charts will appear
            here.
          </p>
        </div>
      )}
    </main>
  );
}
