import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { callLLM } from '../lib/llm.js';
import { STRENGTHS_WEAKNESSES_PROMPT, injectPrompt } from '../lib/prompts.js';
import { getReportSectionIcon, SpinnerIcon } from './icons.jsx';

function MarkdownH2({ children }) {
  const text =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.join('')
        : String(children ?? '');
  const Icon = getReportSectionIcon(text);

  return (
    <h2 className="flex items-center gap-2 mt-8 mb-3">
      {Icon && <Icon className="w-5 h-5 text-gold-500 shrink-0" aria-hidden />}
      <span>{children}</span>
    </h2>
  );
}

const markdownComponents = {
  h2: MarkdownH2,
};

export default function StrengthsWeaknesses({ thesisText, llmProvider }) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    const systemPrompt = injectPrompt(STRENGTHS_WEAKNESSES_PROMPT, {
      THESIS_TEXT: thesisText,
    });
    const result = await callLLM({
      systemPrompt,
      messages: [{ role: 'user', content: 'Analyze my thesis manuscript and provide the full evaluation report.' }],
      maxTokens: 4000,
      provider: llmProvider,
    });
    setReport(result);
    setLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      {!report && !loading && (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <button
            type="button"
            onClick={analyze}
            className="px-10 py-4 rounded-xl bg-gold-500 text-navy-950 font-semibold text-lg hover:bg-gold-400 transition-colors"
          >
            Analyze My Thesis
          </button>
          <p className="mt-4 text-sm text-slate-500 max-w-md text-center">
            One-click evaluation: strengths, weaknesses, chapter notes, predicted questions, and recommendations.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
          <SpinnerIcon className="w-8 h-8 text-gold-500" />
          <p className="mt-4">Evaluating your manuscript... This may take a moment.</p>
        </div>
      )}

      {report && !loading && (
        <article className="prose-thesis max-w-4xl mx-auto">
          <ReactMarkdown components={markdownComponents}>{report}</ReactMarkdown>
          <button
            type="button"
            onClick={analyze}
            className="mt-8 text-sm text-gold-500 hover:text-gold-400"
          >
            Re-run analysis
          </button>
        </article>
      )}
    </div>
  );
}
