import { useState } from 'react';
import { ArrowUpRight, Copy, Check } from 'lucide-react';
import { callLLMStream, truncateWords } from '../lib/llm.js';
import { PANEL_RECOS_PROMPT, injectPrompt, sanitizeForPrompt } from '../lib/prompts.js';
import { btnOutline, btnPrimary, card, inputBase } from '../lib/ui.js';

const CHAPTERS = [
  'General / Introduction (Ch. 1)',
  'Review of Related Literature (Ch. 2)',
  'Methodology (Ch. 3)',
  'Results and Discussion (Ch. 4)',
  'Summary, Conclusions, Recommendations (Ch. 5)',
];

export default function PanelRecos({ thesisText, llmProvider }) {
  const [comments, setComments] = useState('');
  const [chapter, setChapter] = useState(CHAPTERS[0]);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const revise = async () => {
    if (!comments.trim()) return;
    setLoading(true);
    setCopied(false);
    setOutput('');
    const systemPrompt = injectPrompt(PANEL_RECOS_PROMPT, {
      PANELIST_COMMENTS: comments,
      SELECTED_CHAPTER: chapter,
      THESIS_TEXT: sanitizeForPrompt(truncateWords(thesisText, 8000)),
    });
    let firstChunk = true;
    await callLLMStream({
      systemPrompt,
      messages: [{ role: 'user', content: 'Revise the section according to the panel feedback.' }],
      maxTokens: 4000,
      provider: llmProvider,
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
    <div className="flex-1 overflow-y-auto p-6 lg:px-8 md:py-10 max-w-3xl w-full">
      <label className="block text-sm font-medium text-neutral-900 mb-2">
        Paste your panelist&apos;s comments or suggestions
      </label>
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        rows={6}
        placeholder="e.g. Strengthen the justification for sample size in Chapter 3..."
        className={`${inputBase} resize-y`}
      />

      <label className="block text-sm font-medium text-neutral-900 mt-6 mb-2">
        Which part of the thesis does this affect?
      </label>
      <select
        value={chapter}
        onChange={(e) => setChapter(e.target.value)}
        className={inputBase}
      >
        {CHAPTERS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={revise}
        disabled={loading || !comments.trim()}
        className={`${btnPrimary} mt-6 w-full group justify-center pl-6 pr-2 py-3`}
      >
        {loading ? 'Revising section...' : 'Revise This Section'}
        {!loading && (
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-neutral-900">
            <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
          </span>
        )}
      </button>

      {loading && (
        <div className="mt-8">
          <div className="skeleton h-3.5 w-28 rounded mb-3" />
          <div className="rounded-2xl border border-neutral-100 p-5 space-y-2.5">
            {['100%', '90%', '100%', '82%', '100%', '76%', '100%', '66%'].map((w, i) => (
              <div key={i} className="skeleton h-3.5 rounded" style={{ width: w }} />
            ))}
          </div>
        </div>
      )}

      {output && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">Revised Section</h3>
            <button
              type="button"
              onClick={copyOutput}
              className={btnOutline}
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
            </button>
          </div>
          <div className={`${card} p-5 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap`}>
            {output}
          </div>
        </div>
      )}
    </div>
  );
}
