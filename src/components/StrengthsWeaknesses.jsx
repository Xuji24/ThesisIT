import { useState } from 'react';
import { callLLMStream } from '../lib/llm.js';
import { STRENGTHS_WEAKNESSES_PROMPT, injectPrompt } from '../lib/prompts.js';

export default function StrengthsWeaknesses({ thesisText, llmProvider }) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setReport('');
    const systemPrompt = injectPrompt(STRENGTHS_WEAKNESSES_PROMPT, {
      THESIS_TEXT: thesisText,
    });
    let firstChunk = true;
    await callLLMStream({
      systemPrompt,
      messages: [{ role: 'user', content: 'Analyze my thesis manuscript and provide the full evaluation report.' }],
      maxTokens: 4000,
      provider: llmProvider,
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
              <li key={item} className="flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-neutral-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={analyze}
            className="px-8 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Analyze My Thesis
          </button>
        </div>
      )}

      {loading && (
        <div className="max-w-3xl py-8 w-full">
          <p className="text-xs text-neutral-400 mb-8 thinking-dots">
            Evaluating your manuscript
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </p>
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
        <div className="max-w-3xl">
          <p className="whitespace-pre-wrap text-sm text-neutral-800 leading-relaxed">{report}</p>
          <button
            type="button"
            onClick={analyze}
            className="mt-8 text-sm font-medium text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
          >
            Re-run analysis
          </button>
        </div>
      )}
    </div>
  );
}
