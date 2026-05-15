export function getDefaultProvider() {
  return 'openrouter';
}

/** All LLM calls go through the backend — keys stay server-side. */
export async function callLLM({
  systemPrompt,
  messages,
  maxTokens = 2000,
  provider = 'openrouter',
}) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        systemPrompt,
        messages,
        maxTokens,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return `Error: ${data?.error || response.statusText}`;
    }

    return data.text || 'Error: Empty response from server.';
  } catch (err) {
    return `Error: ${err.message || 'Could not reach the API server. Run npm run dev.'}`;
  }
}

/** @deprecated Use callLLM */
export async function callClaude(opts) {
  return callLLM(opts);
}

export function truncateWords(text, maxWords = 8000) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ');
}

export async function fetchProviderStatus() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) {
      return { openrouter: false, openai: false, defaultProvider: 'openrouter' };
    }
    const data = await res.json();
    return {
      openrouter: Boolean(data.openrouter),
      openai: Boolean(data.openai),
      defaultProvider: data.defaultProvider || 'openrouter',
      openaiModel: data.openaiModel,
      openrouterModel: data.openrouterModel,
    };
  } catch {
    return { openrouter: false, openai: false, defaultProvider: 'openrouter' };
  }
}
