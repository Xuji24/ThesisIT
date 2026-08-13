'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Target, TrendingUp, MessageSquare } from 'lucide-react';
import StatTile from './StatTile';
import ScoreBarChart from './ScoreBarChart';
import RadarScoreChart from './RadarScoreChart';
import AreaTrend from './AreaTrend';
import DonutChart from './DonutChart';
import Meter from './Meter';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { gradeColorClass } from '@/lib/chartPalette';

export interface AnalyticsSessionRow {
  id: string;
  started_at: string;
  mode: 'chat' | 'voice';
  difficulty: string;
  overall_score: number | null;
  grade: string | null;
  criteria: Record<string, number>;
  questions_answered: number;
}

const CRITERIA_AXES = ['C1', 'C2', 'C3', 'C4', 'C5'];
const CRITERIA_LABELS: Record<string, string> = {
  C1: 'Content Accuracy',
  C2: 'Depth of Understanding',
  C3: 'Clarity & Articulation',
  C4: 'Technical Competence',
  C5: 'Responsiveness',
};

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All difficulties' },
  { value: 'Standard', label: 'Standard' },
  { value: 'Technical', label: 'Technical' },
  { value: 'Terror Panel', label: 'Terror Panel' },
];

export default function AnalyticsClient({ sessions }: { sessions: AnalyticsSessionRow[] }) {
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [view, setView] = useState<'charts' | 'table'>('charts');

  const filtered = useMemo(
    () => (difficultyFilter === 'all' ? sessions : sessions.filter((s) => s.difficulty === difficultyFilter)),
    [sessions, difficultyFilter],
  );

  const scored = filtered.filter((s) => s.overall_score != null);
  const evaluated = filtered.filter((s) => Object.keys(s.criteria ?? {}).length > 0);
  const latest = evaluated[0] ?? null;
  const first = evaluated[evaluated.length - 1] ?? null;

  const avgScore = scored.length > 0 ? scored.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / scored.length : null;

  const weakestCriterion = useMemo(() => {
    if (!latest) return null;
    const entries = Object.entries(latest.criteria);
    if (!entries.length) return null;
    const [id, score] = entries.reduce((min, e) => (e[1] < min[1] ? e : min));
    return { id, score, label: CRITERIA_LABELS[id] ?? id };
  }, [latest]);

  const totalQuestions = filtered.reduce((sum, s) => sum + s.questions_answered, 0);

  const trendData = [...scored]
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    .map((s) => ({
      x: new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      y: Math.round(s.overall_score ?? 0),
    }));

  const modeCount = { chat: filtered.filter((s) => s.mode === 'chat').length, voice: filtered.filter((s) => s.mode === 'voice').length };

  const gradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of filtered) {
      if (!s.grade) continue;
      counts.set(s.grade, (counts.get(s.grade) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, value]) => ({ label, value }));
  }, [filtered]);

  if (!filtered.length) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-surface-card p-10 text-center">
        <BarChart3 className="w-8 h-8 text-ink-muted mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-ink-primary">No sessions match this filter</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="w-48">
          <CustomSelect value={difficultyFilter} onValueChange={setDifficultyFilter} options={DIFFICULTY_OPTIONS} />
        </div>
        <div className="flex items-center gap-1 bg-surface-sunken rounded-full p-0.5">
          {(['charts', 'table'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                view === v ? 'bg-surface-card text-ink-primary shadow-sm' : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'table' ? (
        <div className="rounded-lg border border-line-hairline bg-surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-hairline text-left text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Mode</th>
                <th className="px-4 py-2.5 font-medium">Difficulty</th>
                <th className="px-4 py-2.5 font-medium">Questions</th>
                <th className="px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-hairline">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5 text-ink-primary tabular-nums">
                    {new Date(s.started_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary capitalize">{s.mode}</td>
                  <td className="px-4 py-2.5 text-ink-secondary">{s.difficulty}</td>
                  <td className="px-4 py-2.5 text-ink-muted tabular-nums">{s.questions_answered}</td>
                  <td className="px-4 py-2.5 text-ink-primary font-medium tabular-nums">
                    {s.overall_score != null ? Math.round(s.overall_score) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 font-semibold ${gradeColorClass(s.grade)}`}>{s.grade ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Hero + KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-line-hairline bg-surface-card p-5 sm:col-span-1">
              <p className="text-xs uppercase tracking-wide font-medium text-ink-muted mb-2">Latest grade</p>
              <p className={`text-4xl font-heading font-bold ${gradeColorClass(latest?.grade ?? null)}`}>
                {latest?.grade ?? '—'}
              </p>
              {latest?.overall_score != null && (
                <p className="text-xs text-ink-muted mt-1 tabular-nums">{Math.round(latest.overall_score)}/100</p>
              )}
            </div>
            <StatTile label="Sessions" value={filtered.length} icon={BarChart3} />
            <StatTile
              label="Avg score"
              value={avgScore != null ? `${Math.round(avgScore)}/100` : '—'}
              icon={TrendingUp}
            />
            <StatTile
              label="Weakest area"
              value={weakestCriterion ? weakestCriterion.id : '—'}
              icon={Target}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {latest && Object.keys(latest.criteria).length > 0 && (
              <div className="rounded-lg border border-line-hairline bg-surface-card p-5">
                <ScoreBarChart
                  title="Latest Criterion Scores"
                  description="Weighted rubric: C1 30%, C2 25%, C3 20%, C4 15%, C5 10%"
                  data={CRITERIA_AXES.map((id) => ({ label: id, score: latest.criteria[id] ?? 0 }))}
                />
              </div>
            )}

            {first && latest && first.id !== latest.id && (
              <div className="rounded-lg border border-line-hairline bg-surface-card p-5">
                <RadarScoreChart
                  title="Progress Shape"
                  description="First session vs. latest — same five criteria"
                  axes={CRITERIA_AXES}
                  series={[
                    { key: 'first', label: 'First session', values: first.criteria },
                    { key: 'latest', label: 'Latest session', values: latest.criteria },
                  ]}
                />
              </div>
            )}

            {trendData.length >= 2 && (
              <div className="rounded-lg border border-line-hairline bg-surface-card p-5 lg:col-span-2">
                <AreaTrend title="Score Trend" description="Overall score across sessions" yLabel="Score" data={trendData} />
              </div>
            )}

            {gradeCounts.length > 0 && (
              <div className="rounded-lg border border-line-hairline bg-surface-card p-5">
                <DonutChart title="Grade Distribution" description="Sessions by letter grade" data={gradeCounts} />
              </div>
            )}

            <div className="rounded-lg border border-line-hairline bg-surface-card p-5 flex flex-col justify-center">
              <Meter
                label="Voice sessions"
                value={modeCount.voice}
                total={modeCount.chat + modeCount.voice}
                valueLabel={`${modeCount.voice} of ${modeCount.chat + modeCount.voice}`}
              />
              <p className="text-xs text-ink-muted mt-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                {totalQuestions} total panel questions answered
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
