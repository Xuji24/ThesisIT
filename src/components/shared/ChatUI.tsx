'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

function SkeletonBubble({ label }: { label?: string }) {
  return (
    <div className="flex items-end gap-2 mb-5">
      <div className="w-6 h-6 rounded-full bg-ink-primary shrink-0 flex items-center justify-center">
        <span className="text-white text-[9px] font-bold tracking-tight">AI</span>
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-surface-card border border-line-hairline px-4 py-3 w-72 max-w-[80%]">
        {label && (
          <p className="text-[10px] uppercase tracking-widest text-ink-muted mb-2.5 font-semibold">
            {label}
          </p>
        )}
        <div className="space-y-2">
          <div className="skeleton h-3 rounded-full" style={{ width: '88%' }} />
          <div className="skeleton h-3 rounded-full" style={{ width: '72%' }} />
          <div className="skeleton h-3 rounded-full" style={{ width: '94%' }} />
          <div className="skeleton h-3 rounded-full" style={{ width: '60%' }} />
          <div className="skeleton h-3 rounded-full" style={{ width: '80%' }} />
        </div>
      </div>
    </div>
  );
}

interface ChatBubbleProps { role: string; content: string; label?: string; }

export function ChatBubble({ role, content, label }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-ink-primary shrink-0 flex items-center justify-center">
          <span className="text-white text-[9px] font-bold tracking-tight">AI</span>
        </div>
      )}
      <div
        className={`max-w-[80%] md:max-w-[68%] px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-2xl rounded-br-sm bg-ink-primary text-white'
            : 'rounded-2xl rounded-bl-sm bg-surface-card border border-line-hairline text-ink-secondary'
        }`}
      >
        {!isUser && label && (
          <p className="text-[10px] uppercase tracking-widest text-ink-muted mb-1.5 font-semibold">
            {label}
          </p>
        )}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({ value, onChange, onSubmit, disabled, placeholder }: ChatInputProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!disabled && value.trim()) onSubmit();
  };

  return (
    <div className="border-t border-line-hairline bg-surface-card px-4 py-4 md:px-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="default"
          size="icon"
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-full h-[42px] w-[42px]"
        >
          <Send className="w-4 h-4" strokeWidth={2} />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}

interface ChatMessage { role: string; content: string; }
interface ChatMessagesProps {
  messages: ChatMessage[];
  endRef: RefObject<HTMLDivElement | null>;
  assistantLabel?: string;
  loading?: boolean;
}

export function ChatMessages({ messages, endRef, assistantLabel = 'Assistant', loading = false }: ChatMessagesProps) {
  useEffect(() => {
    endRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, endRef]);

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-4 py-6 md:px-6">
        {messages.length === 0 && !loading ? (
          <p className="text-center text-ink-muted text-sm mt-8">No messages yet.</p>
        ) : (
          messages.map((msg, i) => (
            <ChatBubble
              key={i}
              role={msg.role}
              content={msg.content}
              label={msg.role === 'assistant' ? assistantLabel : undefined}
            />
          ))
        )}
        {loading && <SkeletonBubble label={assistantLabel} />}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
