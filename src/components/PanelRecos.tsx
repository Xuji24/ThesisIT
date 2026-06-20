'use client';

import { useState } from 'react';
import { Wand2, Copy, Check } from 'lucide-react';
import { callLLMStream } from '../lib/llm';
import { chunkText, retrieveTopChunks } from '../lib/chunkRetrieval';
import { PANEL_RECOS_PROMPT, injectPrompt, sanitizeForPrompt } from '../lib/prompts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Card, CardContent } from '@/components/ui/card';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';
import ReportRenderer from './shared/ReportRenderer';

const CHAPTERS = [
  'General / Introduction (Ch. 1)',
  'Review of Related Literature (Ch. 2)',
  'Methodology (Ch. 3)',
  'Results and Discussion (Ch. 4)',
  'Summary, Conclusions, Recommendations (Ch. 5)',
];

const CHAPTER_OPTIONS = CHAPTERS.map((c) => ({ value: c, label: c }));

interface PanelRecosProps {
  thesisText: string;
}

export default function PanelRecos({ thesisText }: PanelRecosProps) {
  const [comments, setComments] = useLocalStorage(STORAGE_KEYS.PANEL_COMMENTS, '');
  const [chapter, setChapter] = useLocalStorage(STORAGE_KEYS.PANEL_CHAPTER, CHAPTERS[0]);
  const [output, setOutput] = useLocalStorage(STORAGE_KEYS.PANEL_OUTPUT, '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const revise = async () => {
    if (!comments.trim()) return;
    setLoading(true);
    setCopied(false);
    setOutput('');

    // Build a BM25 query from the selected chapter name + panelist comments so
    // we retrieve the chunks most relevant to the section being revised.
    // This replaces the fixed first-3000-words slice with ~1 200 targeted words.
    const ragQuery = `${chapter} ${comments}`;
    const chunks = chunkText(thesisText);
    const relevantChunks = retrieveTopChunks(chunks, ragQuery, 4);
    const contextText =
      relevantChunks.length > 0
        ? relevantChunks.join('\n\n---\n\n')
        : thesisText.slice(0, 12_000); // character fallback

    const systemPrompt = injectPrompt(PANEL_RECOS_PROMPT, {
      PANELIST_COMMENTS: comments,
      SELECTED_CHAPTER: chapter,
      THESIS_TEXT: sanitizeForPrompt(contextText),
    });
    let firstChunk = true;
    await callLLMStream({
      systemPrompt,
      messages: [{ role: 'user', content: 'Revise the section according to the panel feedback.' }],
      maxTokens: 2500,
      task: 'Panelist Recommendations',
      onChunk: (text) => {
        if (firstChunk) { setLoading(false); firstChunk = false; }
        setOutput(text);
      },
    });
    setLoading(false);
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:px-10 md:py-10 max-w-3xl w-full">
      <div className="space-y-8">
        {/* ── Comments input ───────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-2">
            Paste your panelist&apos;s comments or suggestions
          </label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={7}
            placeholder="e.g. Strengthen the justification for sample size in Chapter 3..."
            className="resize-none"
          />
        </div>

        {/* ── Chapter selector ─────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-2">
            Which part of the thesis does this affect?
          </label>
          <CustomSelect
            value={chapter}
            onValueChange={setChapter}
            options={CHAPTER_OPTIONS}
            placeholder="Select a chapter..."
          />
        </div>

        {/* ── Submit button ─────────────────────────────────────────────── */}
        <Button
          type="button"
          onClick={revise}
          disabled={loading || !comments.trim()}
          variant="default"
          className="w-full group justify-center pl-6 pr-2 py-3 rounded-xl h-auto"
        >
          {loading ? 'Revising section...' : 'Revise This Section'}
          {!loading && (
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-neutral-900 ml-3">
              <Wand2 className="w-4 h-4" strokeWidth={2.5} />
            </span>
          )}
        </Button>
      </div>

      {loading && (
        <div className="mt-10">
          <div className="skeleton h-3.5 w-28 rounded mb-4" />
          <div className="rounded-2xl border border-neutral-100 p-6 space-y-3">
            {['100%', '90%', '100%', '82%', '100%', '76%', '100%', '66%'].map((w, i) => (
              <div key={i} className="skeleton h-3.5 rounded" style={{ width: w }} />
            ))}
          </div>
        </div>
      )}

      {output && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-900">Revised Section</h3>
            <Button
              type="button"
              onClick={copyOutput}
              variant="outline"
              size="sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6 pb-6">
              <ReportRenderer text={output} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
