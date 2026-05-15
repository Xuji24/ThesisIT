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

/**
 * Streaming LLM call via SSE. Calls onChunk(accumulatedText) on every token.
 * Returns the final full text when the stream closes.
 */
export async function callLLMStream({
  systemPrompt,
  messages,
  maxTokens = 2000,
  provider = 'openrouter',
  onChunk,
}) {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, systemPrompt, messages, maxTokens }),
    });

    // Graceful fallback: stream endpoint unavailable or any non-2xx → use blocking call
    if (!response.ok) {
      const fallback = await callLLM({ systemPrompt, messages, maxTokens, provider });
      onChunk?.(fallback);
      return fallback;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return fullText;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            const errText = `Error: ${parsed.error}`;
            onChunk?.(errText);
            return errText;
          }
          if (parsed.content) {
            fullText += parsed.content;
            onChunk?.(fullText);
          }
        } catch {
          // skip partial / malformed SSE lines
        }
      }
    }

    return fullText;
  } catch (err) {
    const errText = `Error: ${err.message || 'Stream failed'}`;
    onChunk?.(errText);
    return errText;
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
