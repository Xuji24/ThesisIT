import { useRef, useState } from 'react';
import { callLLM } from '../lib/llm.js';
import { CHAT_WITH_DOC_PROMPT, injectPrompt } from '../lib/prompts.js';
import { ChatInput, ChatMessages } from './shared/ChatUI.jsx';

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

  const systemPrompt = injectPrompt(CHAT_WITH_DOC_PROMPT, {
    THESIS_TEXT: thesisText,
  });

  const ask = async (question) => {
    const text = question.trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    const reply = await callLLM({
      systemPrompt,
      messages: next,
      maxTokens: 2000,
      provider: llmProvider,
    });
    setMessages([...next, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {messages.length === 0 && (
        <div className="p-4 flex flex-wrap gap-2 border-b border-navy-700">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border border-navy-600 text-slate-300 hover:border-gold-500/50 hover:text-gold-400"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <ChatMessages messages={messages} endRef={endRef} assistantLabel="Thesis Assistant" />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => ask(input)}
        disabled={loading}
        placeholder="Ask anything about your thesis..."
        thinkingLabel="Thinking"
      />
    </div>
  );
}
