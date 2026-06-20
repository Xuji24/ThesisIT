'use client';

import { useRef, useState, useEffect } from 'react';
import { callLLMStream, truncateWords } from '../lib/llm';
import { chunkText, retrieveTopChunks } from '../lib/chunkRetrieval';
import { CHAT_WITH_DOC_PROMPT, injectPrompt, sanitizeForPrompt } from '../lib/prompts';
import { ChatInput, ChatMessages } from './shared/ChatUI';
import { Button } from '@/components/ui/button';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';

const SUGGESTIONS = [
  'Summarize Chapter 3',
  'What is my research gap?',
  'Explain my methodology',
  "What are my study's limitations?",
];

interface ChatWithDocProps {
  thesisText: string;
}

export default function ChatWithDoc({ thesisText }: ChatWithDocProps) {
  const [messages, setMessages] = useLocalStorage<{ role: string; content: string }[]>(
    STORAGE_KEYS.CHAT_MESSAGES, []
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamTextRef = useRef('');
  const rafRef = useRef(false);

  // Pre-split thesis into BM25-ready chunks whenever the document changes.
  // Chunks are stored in a ref (not state) because they don't drive rendering.
  const chunksRef = useRef<string[]>([]);
  useEffect(() => {
    chunksRef.current = chunkText(thesisText);
  }, [thesisText]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const ask = async (question: string) => {
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

    // Build a query-specific system prompt using the top-5 most relevant chunks.
    // Fall back to linear truncation if no chunks were generated.
    const relevantChunks = retrieveTopChunks(chunksRef.current, text, 5);
    const contextText =
      relevantChunks.length > 0
        ? relevantChunks.join('\n\n---\n\n')
        : truncateWords(thesisText, 3000);

    const systemPrompt = injectPrompt(CHAT_WITH_DOC_PROMPT, {
      THESIS_TEXT: sanitizeForPrompt(contextText),
    });

    let firstChunk = true;
    await callLLMStream({
      systemPrompt,
      messages: next,
      maxTokens: 2000,
      task: 'Chat with Thesis',
      signal: controller.signal,
      onChunk: (chunk: string) => {
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
            <Button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              {s}
            </Button>
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
