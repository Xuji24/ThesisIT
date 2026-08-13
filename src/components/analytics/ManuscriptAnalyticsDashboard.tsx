'use client';

import { BarChart3, AlertTriangle, CheckCircle2, HelpCircle, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseManuscriptReport } from '@/lib/parseReport';
import ScoreBarChart from './ScoreBarChart';

interface ManuscriptAnalyticsDashboardProps {
  report: string;
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
  tone: 'emerald' | 'amber' | 'blue' | 'violet';
}) {
  if (!items.length) return null;

  const border = {
    emerald: 'border-status-good/25',
    amber: 'border-status-warning/30',
    blue: 'border-[#2a78d6]/25',
    violet: 'border-[#4a3aa7]/25',
  }[tone];

  const bg = {
    emerald: 'bg-status-good/10',
    amber: 'bg-status-warning/10',
    blue: 'bg-[#2a78d6]/10',
    violet: 'bg-[#4a3aa7]/10',
  }[tone];

  return (
    <Card className={`border ${border} ${bg}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
          <span className="ml-auto text-[10px] font-normal text-ink-muted">{items.length} items</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 max-h-48 overflow-y-auto scrollbar-brand">
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-ink-secondary leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ManuscriptAnalyticsDashboard({ report }: ManuscriptAnalyticsDashboardProps) {
  const parsed = parseManuscriptReport(report);
  const avgMetric =
    parsed.metrics.length > 0
      ? parsed.metrics.reduce((s, m) => s + m.score, 0) / parsed.metrics.length
      : null;

  return (
    <div className="space-y-6 mb-8">
      <div>
        <h3 className="text-lg font-semibold text-ink-primary flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" />
          Manuscript Analytics
        </h3>
        <p className="text-xs text-ink-muted mt-1 max-w-md">
          Visual overview of thesis quality scores, findings distribution, and preparation insights.
        </p>
        {avgMetric != null && (
          <p className="text-sm text-ink-secondary mt-2">
            Average chapter quality score:{' '}
            <span className="font-semibold text-accent-hover tabular-nums">{avgMetric.toFixed(1)}/10</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {parsed.metrics.length > 0 ? (
          <Card className="border-line-hairline bg-surface-card lg:col-span-2">
            <CardContent className="pt-6">
              <ScoreBarChart
                title="Manuscript Quality Scores"
                description="AI-assessed quality across key thesis dimensions (1–10)"
                data={parsed.metrics.map((m) => ({
                  label: m.label.replace(' & ', '\n& '),
                  score: m.score,
                }))}
              />
            </CardContent>
          </Card>
        ) : parsed.findingsCounts.length > 0 ? (
          <Card className="border-line-hairline bg-surface-card lg:col-span-2">
            <CardContent className="pt-6">
              <ScoreBarChart
                title="Findings Overview"
                description="Count of identified strengths, weaknesses, questions, and recommendations"
                data={parsed.findingsCounts.map((f) => ({
                  label: f.label,
                  score: f.count,
                }))}
                maxScore={Math.max(...parsed.findingsCounts.map((f) => f.count), 10)}
              />
            </CardContent>
          </Card>
        ) : null}

        {parsed.metrics.length > 0 && parsed.findingsCounts.length > 0 && (
          <Card className="border-line-hairline bg-surface-card lg:col-span-2">
            <CardContent className="pt-6">
              <ScoreBarChart
                title="Findings Distribution"
                description="Volume of strengths, weaknesses, predicted questions, and recommendations"
                data={parsed.findingsCounts.map((f) => ({
                  label: f.label,
                  score: f.count,
                }))}
                maxScore={Math.max(...parsed.findingsCounts.map((f) => f.count), 10)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightList title="Strengths" items={parsed.strengths} icon={CheckCircle2} tone="emerald" />
        <InsightList
          title="Weaknesses & Loopholes"
          items={parsed.weaknesses}
          icon={AlertTriangle}
          tone="amber"
        />
        <InsightList
          title="Predicted Panel Questions"
          items={parsed.predictedQuestions}
          icon={HelpCircle}
          tone="violet"
        />
        <InsightList
          title="Recommendations"
          items={parsed.recommendations}
          icon={Lightbulb}
          tone="blue"
        />
      </div>

      {parsed.chapterNotes.length > 0 && (
        <Card className="border-line-hairline bg-surface-card">
          <CardHeader>
            <CardTitle className="text-sm">Chapter-by-Chapter Notes</CardTitle>
            <CardDescription>Focused critique per chapter</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {parsed.chapterNotes.map((note, i) => (
              <p key={i} className="text-xs text-ink-secondary leading-relaxed border-l-2 border-status-good/30 pl-3">
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
