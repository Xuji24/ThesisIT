import { useEffect, useState } from 'react';
import { fetchProviderStatus, getDefaultProvider } from '../lib/llm.js';

const LABELS = {
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
};

export default function ProviderSelector({ provider, onChange }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchProviderStatus().then(setStatus);
  }, []);

  if (!status) return null;

  const options = ['openrouter', 'openai'].filter((id) => status[id]);

  if (options.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-500">AI:</span>
      {options.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
            provider === id
              ? 'border-gold-500/50 bg-gold-500/15 text-gold-400'
              : 'border-navy-600 text-slate-400 hover:text-slate-200'
          }`}
          title={
            id === 'openrouter'
              ? 'Routed via backend (OPENROUTER_API_KEY)'
              : 'Routed via backend (OPENAI_API_KEY)'
          }
        >
          {LABELS[id]}
        </button>
      ))}
    </div>
  );
}

export function useInitialProvider() {
  const [provider, setProvider] = useState(getDefaultProvider());

  useEffect(() => {
    fetchProviderStatus().then((s) => {
      const preferred = getDefaultProvider();
      if (s[preferred]) {
        setProvider(preferred);
      } else if (s.openrouter) {
        setProvider('openrouter');
      } else if (s.openai) {
        setProvider('openai');
      }
    });
  }, []);

  return [provider, setProvider];
}
