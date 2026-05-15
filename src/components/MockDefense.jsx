import { useRef, useState } from 'react';
import { callLLM, truncateWords } from '../lib/llm.js';
import { MOCK_DEFENSE_PROMPT, injectPrompt } from '../lib/prompts.js';
import { ChatInput, ChatMessages } from './shared/ChatUI.jsx';

const DIFFICULTIES = ['Standard', 'Technical', 'Terror Panel'];

export default function MockDefense({ thesisText, llmProvider }) {
  const [difficulty, setDifficulty] = useState('Standard');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const endRef = useRef(null);

  const systemPrompt = injectPrompt(MOCK_DEFENSE_PROMPT, {
    DIFFICULTY: difficulty,
    THESIS_TEXT: truncateWords(thesisText, 8000),
  });

  const sendToClaude = async (nextMessages) => {
    setLoading(true);
    const reply = await callLLM({
      systemPrompt,
      messages: nextMessages,
      maxTokens: 2000,
      provider: llmProvider,
    });
    setMessages([...nextMessages, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  const startSession = async () => {
    setStarted(true);
    const first = [{ role: 'user', content: 'Begin the oral defense.' }];
    setMessages(first);
    await sendToClaude(first);
  };

  const sendReply = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    await sendToClaude(next);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-4 border-b border-navy-700 bg-navy-900/50 flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-400">Difficulty:</span>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            disabled={started}
            onClick={() => setDifficulty(d)}
            className={`px-3 py-1 rounded-lg text-sm ${
              difficulty === d
                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                : 'text-slate-400 border border-navy-700 hover:border-navy-600'
            } disabled:opacity-50`}
          >
            {d}
          </button>
        ))}
        {!started && (
          <button
            type="button"
            onClick={startSession}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded-lg bg-gold-500 text-navy-950 font-semibold text-sm hover:bg-gold-400"
          >
            Start Defense Session
          </button>
        )}
      </div>

      {started ? (
        <>
          <ChatMessages messages={messages} endRef={endRef} assistantLabel="The Panel" />
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={sendReply}
            disabled={loading}
            placeholder="Type your answer..."
            thinkingLabel="Panel is thinking"
          />
        </>
      ) : (
        <p className="text-center text-slate-500 text-sm mt-16 px-4">
          Choose a difficulty level and start your mock oral defense.
        </p>
      )}
    </div>
  );
}
