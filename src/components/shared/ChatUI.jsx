import { useEffect } from 'react';
import { Send } from 'lucide-react';
import { btnPrimary, inputBase } from '../../lib/ui.js';

function SkeletonBubble({ label }) {
  return (
    <div className="flex items-end gap-2 mb-5">
      <div className="w-6 h-6 rounded-full bg-neutral-900 shrink-0 flex items-center justify-center">
        <span className="text-white text-[9px] font-bold tracking-tight">AI</span>
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-white border border-neutral-200 shadow-sm px-4 py-3 w-56">
        {label && (
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2.5 font-semibold">
            {label}
          </p>
        )}
        <div className="space-y-2">
          <div className="skeleton h-3 w-44 rounded-full" />
          <div className="skeleton h-3 w-36 rounded-full" />
          <div className="skeleton h-3 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ChatBubble({ role, content, label }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-neutral-900 shrink-0 flex items-center justify-center">
          <span className="text-white text-[9px] font-bold tracking-tight">AI</span>
        </div>
      )}
      <div
        className={`max-w-[80%] md:max-w-[68%] px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'rounded-2xl rounded-br-sm bg-neutral-900 text-white'
            : 'rounded-2xl rounded-bl-sm bg-white border border-neutral-200 text-neutral-800 shadow-sm'
        }`}
      >
        {!isUser && label && (
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5 font-semibold">
            {label}
          </p>
        )}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export function ChatInput({ value, onChange, onSubmit, disabled, placeholder }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && value.trim()) onSubmit();
  };

  return (
    <div className="border-t border-neutral-100 bg-white px-4 py-4 md:px-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={`${inputBase} flex-1`}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={`${btnPrimary} shrink-0 px-4!`}
        >
          <Send className="w-4 h-4" strokeWidth={2} />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </div>
  );
}

export function ChatMessages({ messages, endRef, assistantLabel = 'Assistant', loading = false }) {
  useEffect(() => {
    endRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, endRef]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
      {messages.length === 0 && !loading ? (
        <p className="text-center text-neutral-400 text-sm mt-8">No messages yet.</p>
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
  );
}
