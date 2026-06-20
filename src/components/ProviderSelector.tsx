'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { fetchProviderStatus, getDefaultProvider } from '../lib/llm';

const LABELS: Record<string, string> = {
  openrouter:      'OpenRouter',
  openai:          'OpenAI',
  groq:            'Groq',
  nvidia_deepseek: 'DeepSeek R1',
  nvidia_glm:      'GLM-4',
};

interface ProviderSelectorProps {
  provider: string;
  onChange: (provider: string) => void;
}

export default function ProviderSelector({ provider, onChange }: ProviderSelectorProps) {
  const [status, setStatus] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    fetchProviderStatus().then(({ defaultProvider: _ignored, ...booleans }) => {
      setStatus(booleans as Record<string, boolean>);
    });
  }, []);

  if (!status) return null;

  const options = ['openrouter', 'openai', 'groq', 'nvidia_deepseek', 'nvidia_glm'].filter((id) => status[id]);

  if (options.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-neutral-400 hidden sm:inline">AI</span>
      {options.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`cursor-pointer border transition-colors text-xs px-3 py-1.5 h-auto rounded-full ${
            provider === id
              ? 'bg-neutral-900 border-neutral-900 text-white'
              : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
          } font-medium`}
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
      if ((s as Record<string, boolean>)[preferred]) {
        setProvider(preferred);
      } else if (s.openrouter) {
        setProvider('openrouter');
      } else if (s.nvidia_deepseek) {
        setProvider('nvidia_deepseek');
      } else if (s.groq) {
        setProvider('groq');
      } else if (s.openai) {
        setProvider('openai');
      } else if (s.nvidia_glm) {
        setProvider('nvidia_glm');
      }
    });
  }, []);

  return [provider, setProvider] as [string, Dispatch<SetStateAction<string>>];
}
