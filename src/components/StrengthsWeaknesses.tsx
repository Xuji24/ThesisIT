'use client';

import { useState } from 'react';
import { callLLMStream } from '../lib/llm';
import { extractSections } from '../lib/extractSections';
import { chunkText, retrieveTopChunks } from '../lib/chunkRetrieval';
import { STRENGTHS_WEAKNESSES_PROMPT, injectPrompt, sanitizeForPrompt } from '../lib/prompts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';
import ReportRenderer from './shared/ReportRenderer';

interface StrengthsWeaknessesProps {
  thesisText: string;
}

export default function StrengthsWeaknesses({ thesisText }: StrengthsWeaknessesProps) {
  const [report, setReport] = useLocalStorage(STORAGE_KEYS.SW_REPORT, '');
  const [loading, setLoading] = useState(false);
  // Track whether the report already exists so re-runs can bypass the cache
  // and force a fresh upstream call (instead of silently returning the cached text).
  const isRerun = report.length > 0;

  const analyze = async (forceRefresh = false) => {
    setLoading(true);
    setReport('');

    // ── Multi-query BM25 for full-document, multi-user coverage ──────────────
    // Each query targets one academic chapter section using field-agnostic
    // structural terms (Introduction, Methodology, etc.).  BM25 scores ALL
    // chunks in the document and returns the 2 most relevant per query, so
    // every part of the thesis — including the last page — contributes to the
    // context regardless of document length or academic discipline.
    //
    // Result: ~3 000 words spread proportionally across all 5 chapters,
    // compared to extractSections() which can cover only ~22% of a 100-page
    // thesis before hitting its word budget.
    const chunks = chunkText(thesisText);
    let contextText: string;

    if (chunks.length >= 3) {
      const CHAPTER_QUERIES = [
        'abstract introduction background problem statement objectives hypothesis significance',
        'review of related literature theoretical framework conceptual model related studies',
        'methodology research design sampling technique data collection statistical treatment',
        'results findings discussion analysis interpretation tables figures',
        'conclusions summary recommendations implications future research',
      ];
      const seen = new Set<string>();
      const contextParts: string[] = [];
      for (const q of CHAPTER_QUERIES) {
        for (const chunk of retrieveTopChunks(chunks, q, 2)) {
          if (!seen.has(chunk)) { seen.add(chunk); contextParts.push(chunk); }
        }
      }
      contextText = contextParts.join('\n\n---\n\n');
    } else {
      // Short or unstructured document — fall back to section-aware extraction
      contextText = extractSections(thesisText);
    }

    const systemPrompt = injectPrompt(STRENGTHS_WEAKNESSES_PROMPT, {
      THESIS_TEXT: sanitizeForPrompt(contextText),
    });
    let firstChunk = true;
    await callLLMStream({
      systemPrompt,
      messages: [{ role: 'user', content: 'Analyze the manuscript' }],
      maxTokens: 2500,
      task: 'Strengths & Weaknesses',
      bypassCache: forceRefresh,
      onChunk: (text) => {
        if (firstChunk) { setLoading(false); firstChunk = false; }
        setReport(text);
      },
    });
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:px-8 md:py-10 w-full">
      {!report && !loading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Manuscript Evaluation</h2>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm leading-relaxed">
            One-click AI analysis of your full thesis. The report covers:
          </p>
          <ul className="text-sm text-neutral-500 space-y-2 mb-8 text-left">
            {[
              'Strengths',
              'Weaknesses & Loopholes',
              'Chapter-by-Chapter Notes',
              'Predicted Panel Questions',
              'Recommendations Before Defense',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 hover:translate-x-1 hover:text-emerald-600 transition-all duration-200 cursor-default">
                <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            onClick={() => analyze(false)}
            variant="default"
            className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all duration-300 text-white"
          >
            Analyze My Thesis
          </Button>
        </div>
      )}

      {loading && (
        <div className="max-w-3xl py-8 w-full">
          <div className="flex items-center gap-3 mb-8">
            <Spinner size="sm" />
            <p className="text-xs text-neutral-400">
              Evaluating your manuscript
            </p>
          </div>
          <div className="space-y-10">
            {[
              { hw: '42%', lines: ['100%', '92%', '85%', '68%'] },
              { hw: '58%', lines: ['100%', '94%', '87%', '75%', '60%'] },
              { hw: '50%', lines: ['100%', '90%', '80%', '95%', '70%'] },
              { hw: '46%', lines: ['100%', '92%', '84%', '70%', '64%'] },
              { hw: '52%', lines: ['100%', '86%', '70%'] },
            ].map((section, i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton h-5 rounded-md" style={{ width: section.hw }} />
                <div className="space-y-2">
                  {section.lines.map((w, j) => (
                    <div key={j} className="skeleton h-3.5 rounded" style={{ width: w }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report && !loading && (
        <Card className="max-w-3xl w-full hover:shadow-xl hover:shadow-emerald-100/50 hover:border-emerald-100 transition-all duration-500">
          <CardContent className="pt-6">
            <ReportRenderer text={report} />
            <Button
              type="button"
              onClick={() => analyze(true)}
              variant="outline"
              className="mt-6 cursor-pointer text-emerald-600 border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
            >
              Re-run analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
