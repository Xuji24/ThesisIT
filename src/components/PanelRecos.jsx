import { useState } from 'react';
import { callLLM } from '../lib/llm.js';
import { PANEL_RECOS_PROMPT, injectPrompt } from '../lib/prompts.js';

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
    const systemPrompt = injectPrompt(PANEL_RECOS_PROMPT, {
      PANELIST_COMMENTS: comments,
      SELECTED_CHAPTER: chapter,
      THESIS_TEXT: thesisText,
    });
    const result = await callLLM({
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Revise the section according to the panel feedback.',
        },
      ],
      maxTokens: 4000,
      provider: llmProvider,
    });
    setOutput(result);
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
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl mx-auto w-full">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Paste your panelist&apos;s comments or suggestions
      </label>
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        rows={6}
        placeholder="e.g. Strengthen the justification for sample size in Chapter 3..."
        className="w-full rounded-xl bg-navy-800 border border-navy-700 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-y"
      />

      <label className="block text-sm font-medium text-slate-300 mt-6 mb-2">
        Which part of the thesis does this affect?
      </label>
      <select
        value={chapter}
        onChange={(e) => setChapter(e.target.value)}
        className="w-full rounded-xl bg-navy-800 border border-navy-700 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
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
        className="mt-6 w-full py-3 rounded-xl bg-gold-500 text-navy-950 font-semibold hover:bg-gold-400 disabled:opacity-40"
      >
        {loading ? 'Revising section based on panel feedback...' : 'Revise This Section'}
      </button>

      {output && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gold-400">Revised Section</h3>
            <button
              type="button"
              onClick={copyOutput}
              className="text-xs px-3 py-1.5 rounded-lg border border-navy-600 text-slate-300 hover:text-gold-400"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <div className="rounded-xl bg-navy-800 border border-navy-700 p-5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {output}
          </div>
        </div>
      )}
    </div>
  );
}
