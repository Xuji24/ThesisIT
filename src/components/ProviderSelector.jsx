import { useEffect, useState } from 'react';
import { fetchProviderStatus, getDefaultProvider } from '../lib/llm.js';
import { pillActive, pillInactive } from '../lib/ui.js';

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
      <span className="text-xs text-neutral-400 hidden sm:inline">AI</span>
      {options.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`text-xs px-3 py-1.5 transition-colors ${
            provider === id ? pillActive : pillInactive
          }`}
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
