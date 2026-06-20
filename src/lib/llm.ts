export function getDefaultProvider() {
  return 'openrouter';
}

interface CallLLMParams {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
}

/** All LLM calls go through the backend — keys stay server-side. */
export async function callLLM({
  systemPrompt,
  messages,
  maxTokens = 2000,
}: CallLLMParams): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
    return `Error: ${(err as { message?: string }).message || 'Could not reach the API server. Run npm run dev.'}`;
  }
}

/**
 * Streaming LLM call via SSE. Calls onChunk(accumulatedText) on every token.
 * Returns the final full text when the stream closes.
 */
interface CallLLMStreamParams {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
  /** When true the server skips the response cache and always calls the upstream
   *  provider. Use for explicit user-triggered re-runs where a fresh answer is
   *  expected. Normal first-run calls should leave this unset (false). */
  bypassCache?: boolean;
  /** Human-readable label for the feature making this call.
   *  Appears in server logs: [AI] Mock Defense → groq (llama-3.3-70b-versatile) */
  task?: string;
}

/**
 * Strip <think>...</think> reasoning blocks that some models (DeepSeek, etc.) emit.
 * Handles partial blocks during streaming — removes everything up to and including </think>.
 */
function stripThinkBlocks(text: string): string {
  // Remove complete blocks first
  let result = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Remove incomplete opening block (mid-stream)
  result = result.replace(/<think>[\s\S]*/i, '');
  return result.trimStart();
}

export async function callLLMStream({
  systemPrompt,
  messages,
  maxTokens = 2000,
  onChunk,
  signal,
  bypassCache = false,
  task,
}: CallLLMStreamParams) {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, messages, maxTokens, bypassCache, task }),
      signal,
    });

    // Graceful fallback: stream endpoint unavailable or any non-2xx → use blocking call
    if (!response.ok) {
      const fallback = await callLLM({ systemPrompt, messages, maxTokens });
      onChunk?.(fallback);
      return fallback;
    }

    if (!response.body) {
      const fallback = await callLLM({ systemPrompt, messages, maxTokens });
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
            const cleaned = stripThinkBlocks(fullText);
            if (cleaned) onChunk?.(cleaned);
          }
        } catch {
          // skip partial / malformed SSE lines
        }
      }
    }

    return stripThinkBlocks(fullText) || fullText;
  } catch (err) {
    // Intentional abort — exit silently without writing an error message to the chat
    if (err instanceof DOMException && err.name === 'AbortError') return '';
    const errText = `Error: ${(err as { message?: string }).message || 'Stream failed'}`;
    onChunk?.(errText);
    return errText;
  }
}

export function truncateWords(text: string, maxWords = 8000): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ');
}

export async function fetchProviderStatus() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) {
      return { openrouter: false, openai: false, groq: false, defaultProvider: 'openrouter' };
    }
    const data = await res.json();
    return {
      openrouter:      Boolean(data.openrouter),
      openai:          Boolean(data.openai),
      groq:            Boolean(data.groq),
      nvidia_deepseek: Boolean(data.nvidia_deepseek),
      nvidia_glm:      Boolean(data.nvidia_glm),
      defaultProvider: data.defaultProvider || 'openrouter',
    };
  } catch {
    return { openrouter: false, openai: false, groq: false, defaultProvider: 'openrouter' };
  }
}
