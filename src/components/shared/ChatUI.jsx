import { useEffect } from 'react';

export function ChatBubble({ role, content, label }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-gold-500/20 border border-gold-500/30 text-slate-100'
            : 'bg-navy-800 border border-navy-700 text-slate-200'
        }`}
      >
        {!isUser && label && (
          <p className="text-xs text-gold-500/80 mb-1 font-medium">{label}</p>
        )}
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export function ChatInput({ value, onChange, onSubmit, disabled, placeholder, thinkingLabel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && value.trim()) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-navy-700 bg-navy-900/80 p-4">
      {disabled && thinkingLabel && (
        <p className="text-sm text-slate-400 mb-2 thinking-dots">
          {thinkingLabel}
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 rounded-xl bg-navy-800 border border-navy-700 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="px-5 py-2.5 rounded-xl bg-gold-500 text-navy-950 font-semibold text-sm hover:bg-gold-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </form>
  );
}

export function ChatMessages({ messages, endRef, assistantLabel = 'Assistant' }) {
  useEffect(() => {
    endRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, endRef]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {messages.length === 0 ? (
        <p className="text-center text-slate-500 text-sm mt-8">No messages yet.</p>
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
      <div ref={endRef} />
    </div>
  );
}
