import { useRef, useState, useMemo, useEffect } from 'react';
import { callLLMStream, truncateWords } from '../lib/llm.js';
import { CHAT_WITH_DOC_PROMPT, injectPrompt, sanitizeForPrompt } from '../lib/prompts.js';
import { ChatInput, ChatMessages } from './shared/ChatUI.jsx';
import { pillInactive } from '../lib/ui.js';

const SUGGESTIONS = [
  'Summarize Chapter 3',
  'What is my research gap?',
  'Explain my methodology',
  "What are my study's limitations?",
];

export default function ChatWithDoc({ thesisText, llmProvider }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const abortRef = useRef(null);
  const streamTextRef = useRef('');
  const rafRef = useRef(false);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const systemPrompt = useMemo(
    () => injectPrompt(CHAT_WITH_DOC_PROMPT, {
      THESIS_TEXT: sanitizeForPrompt(truncateWords(thesisText, 8000)),
    }),
    [thesisText]
  );

  const ask = async (question) => {
    const text = question.trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages.slice(-20), { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    streamTextRef.current = '';
    let firstChunk = true;
    await callLLMStream({
      systemPrompt,
      messages: next,
      maxTokens: 2000,
      provider: llmProvider,
      signal: controller.signal,
      onChunk: (chunk) => {
        if (firstChunk) { setLoading(false); firstChunk = false; }
        streamTextRef.current = chunk;
        if (!rafRef.current) {
          rafRef.current = true;
          requestAnimationFrame(() => {
            rafRef.current = false;
            setMessages([...next, { role: 'assistant', content: streamTextRef.current }]);
          });
        }
      },
    });
    setMessages([...next, { role: 'assistant', content: streamTextRef.current }]);
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      {messages.length === 0 && (
        <div className="px-6 lg:px-8 py-4 flex flex-wrap gap-2 border-b border-neutral-100">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={loading}
              className={`text-xs px-3 py-1.5 ${pillInactive} disabled:opacity-50`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <ChatMessages messages={messages} endRef={endRef} assistantLabel="Thesis Assistant" loading={loading} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => ask(input)}
        disabled={loading}
        placeholder="Ask anything about your thesis..."
      />
    </div>
  );
}
