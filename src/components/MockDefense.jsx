import { useRef, useState, useMemo, useEffect } from 'react';
import { callLLMStream, truncateWords } from '../lib/llm.js';
import { MOCK_DEFENSE_PROMPT, injectPrompt, sanitizeForPrompt } from '../lib/prompts.js';
import { ChatInput, ChatMessages } from './shared/ChatUI.jsx';
import { SpinnerIcon } from './icons.jsx';

const DIFFICULTIES = ['Standard', 'Technical', 'Terror Panel'];

const DIFFICULTY_DESCRIPTIONS = {
  Standard: 'Rigorous but supportive',
  Technical: 'Deep dive into methodology & stats',
  'Terror Panel': 'Relentless follow-ups, no mercy',
};

export default function MockDefense({ thesisText, llmProvider }) {
  const [difficulty, setDifficulty] = useState('Standard');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const streamTextRef = useRef('');
  const rafRef = useRef(false);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const systemPrompt = useMemo(
    () => injectPrompt(MOCK_DEFENSE_PROMPT, {
      DIFFICULTY: difficulty,
      THESIS_TEXT: sanitizeForPrompt(truncateWords(thesisText, 8000)),
    }),
    [difficulty, thesisText]
  );

  const sendToClaude = async (nextMessages) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    streamTextRef.current = '';
    let firstChunk = true;
    await callLLMStream({
      systemPrompt,
      messages: nextMessages,
      maxTokens: 2000,
      provider: llmProvider,
      signal: controller.signal,
      onChunk: (text) => {
        if (firstChunk) { setLoading(false); firstChunk = false; }
        streamTextRef.current = text;
        if (!rafRef.current) {
          rafRef.current = true;
          requestAnimationFrame(() => {
            rafRef.current = false;
            setMessages([...nextMessages, { role: 'assistant', content: streamTextRef.current }]);
          });
        }
      },
    });
    setMessages([...nextMessages, { role: 'assistant', content: streamTextRef.current }]);
    setLoading(false);
  };

  const startSession = async () => {
    setStarted(true);
    const first = [{ role: 'user', content: 'Begin the oral defense.' }];
    setMessages(first);
    await sendToClaude(first);
  };

  const resetSession = () => {
    setStarted(false);
    setMessages([]);
    setInput('');
    setLoading(false);
  };

  const sendReply = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages.slice(-20), { role: 'user', content: text }];
    setMessages(next);
    await sendToClaude(next);
  };

  if (!started) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Mock Defense Session</h2>
        <p className="text-sm text-neutral-500 mb-10 max-w-sm leading-relaxed">
          Simulate a live oral defense. The AI acts as a strict panelist — one question at a
          time, with critical follow-ups on weak answers.
        </p>

        <div className="w-full max-w-sm mb-8">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-3">
            Select Difficulty
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`py-3 px-2 rounded-xl border text-sm font-medium transition-colors ${
                  difficulty === d
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-500 hover:text-neutral-900'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-neutral-400">{DIFFICULTY_DESCRIPTIONS[difficulty]}</p>
        </div>

        <button
          type="button"
          onClick={startSession}
          disabled={loading}
          className="px-8 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <SpinnerIcon className="w-4 h-4" />
              Starting session...
            </span>
          ) : (
            'Start Defense Session'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      <div className="px-6 lg:px-8 py-3 border-b border-neutral-100 flex items-center gap-3">
        <span className="text-xs text-neutral-500">
          Difficulty:{' '}
          <span className="font-semibold text-neutral-900">{difficulty}</span>
        </span>
        <button
          type="button"
          onClick={resetSession}
          className="ml-auto text-xs text-neutral-400 hover:text-neutral-700 underline underline-offset-2 transition-colors"
        >
          New Session
        </button>
      </div>
      <ChatMessages messages={messages} endRef={endRef} assistantLabel="The Panel" loading={loading} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={sendReply}
        disabled={loading}
        placeholder="Type your answer..."
      />
    </div>
  );
}
