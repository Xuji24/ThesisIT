'use client';

import { BarChart3, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseEvalReport } from '@/lib/parseReport';
import { gradeColorClass } from '@/lib/chartPalette';
import ScoreBarChart from './ScoreBarChart';

interface DefenseAnalyticsDashboardProps {
  evalReport: string;
}

function InsightList({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: React.ComponentType<{ className?: string }>;
  tone: 'emerald' | 'amber' | 'blue';
}) {
  if (!items.length) return null;

  const tones = {
    emerald: 'border-status-good/25 bg-status-good/10 text-status-good',
    amber: 'border-status-warning/30 bg-status-warning/10 text-[#8a5a00]',
    blue: 'border-[#2a78d6]/25 bg-[#2a78d6]/10 text-[#1c5cab]',
  };

  return (
    <Card className={`border ${tones[tone].split(' ')[0]} ${tones[tone].split(' ')[1]}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {items.slice(0, 5).map((item, i) => (
            <li key={i} className="text-xs text-ink-secondary leading-relaxed pl-3 border-l-2 border-current/20">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function DefenseAnalyticsDashboard({ evalReport }: DefenseAnalyticsDashboardProps) {
  const parsed = parseEvalReport(evalReport);
  const hasCriteria = parsed.criteria.some((c) => c.score > 0);
  const hasQuestions = parsed.questions.some((q) => q.score > 0);

  return (
    <div className="space-y-6 mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink-primary flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            Defense Analytics
          </h3>
          <p className="text-xs text-ink-muted mt-1 max-w-md">
            Visual breakdown of your mock defense performance, criterion scores, and preparation
            feedback.
          </p>
        </div>
        {(parsed.grade || parsed.overallScore != null) && (
          <div className="flex items-center gap-3">
            {parsed.grade && (
              <Badge
                variant="outline"
                className={`text-2xl font-bold px-4 py-2 rounded-md border-line-hairline ${gradeColorClass(parsed.grade)}`}
              >
                {parsed.grade}
              </Badge>
            )}
            {parsed.overallScore != null && (
              <div className="text-right">
                <p className="text-2xl font-bold text-ink-primary tabular-nums">
                  {Math.round(parsed.overallScore)}
                  <span className="text-sm font-normal text-ink-muted">/100</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-ink-muted">Overall</p>
              </div>
            )}
          </div>
        )}
      </div>

      {parsed.summary && (
        <Card className="border-line-hairline bg-surface-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-ink-secondary leading-relaxed">{parsed.summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasCriteria && (
          <Card className="border-line-hairline bg-surface-card">
            <CardContent className="pt-6">
              <ScoreBarChart
                title="Criterion Scores"
                description="Weighted rubric: C1 30%, C2 25%, C3 20%, C4 15%, C5 10%"
                data={parsed.criteria.map((c) => ({
                  label: c.id,
                  score: c.score,
                }))}
              />
              <div className="mt-3 grid grid-cols-1 gap-1">
                {parsed.criteria.map((c) => (
                  <p key={c.id} className="text-[10px] text-ink-muted">
                    <span className="font-semibold text-ink-secondary">{c.id}</span> — {c.label} ({c.weight}%)
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasQuestions && (
          <Card className="border-line-hairline bg-surface-card">
            <CardContent className="pt-6">
              <ScoreBarChart
                title="Per-Question Scores"
                description="How well you answered each panel question (1–10)"
                data={parsed.questions.map((q) => ({
                  label: q.id,
                  score: q.score,
                }))}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {parsed.questions.length > 0 && (
        <Card className="border-line-hairline bg-surface-card">
          <CardHeader>
            <CardTitle className="text-sm">Question Feedback</CardTitle>
            <CardDescription>Strengths and gaps per panel question</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {parsed.questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-line-hairline p-4 bg-surface-sunken/60">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-ink-primary">{q.id}: {q.title}</p>
                  <Badge variant="outline" className="text-xs tabular-nums shrink-0">
                    {q.score}/10
                  </Badge>
                </div>
                {q.strength && (
                  <p className="text-xs text-status-good mb-1">
                    <span className="font-semibold">Strength:</span> {q.strength}
                  </p>
                )}
                {q.gap && (
                  <p className="text-xs text-[#8a5a00]">
                    <span className="font-semibold">Gap:</span> {q.gap}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightList
          title="Top Strengths"
          items={parsed.topStrengths}
          icon={CheckCircle2}
          tone="emerald"
        />
        <InsightList
          title="Critical Gaps"
          items={parsed.criticalGaps}
          icon={AlertTriangle}
          tone="amber"
        />
        <InsightList
          title="Recommendations"
          items={parsed.recommendations}
          icon={Lightbulb}
          tone="blue"
        />
      </div>
    </div>
  );
}
