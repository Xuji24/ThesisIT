/**
 * Shared server-side LLM utilities for Next.js Route Handlers.
 * Extracted from server/index.js — single source of truth for provider config.
 */

export type Provider = 'openai' | 'openrouter' | 'groq' | 'nvidia_deepseek' | 'nvidia_glm' | 'kimi';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ProviderConfig {
  url: string;
  apiKey: string | undefined;
  model: string;
  envName: string;
  extraHeaders: Record<string, string>;
}

interface ChatCompletionParams {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens: number;
  extraHeaders?: Record<string, string>;
  provider: Provider;
}

interface ResolveProviderChatParams {
  provider: Provider;
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens: number;
}

interface LlmError extends Error {
  status?: number;
}

const APP_TITLE = 'ThesisIT';
const MAX_ALLOWED_TOKENS = 4000;
const MAX_MESSAGES = 20;
const MAX_MSG_CONTENT_CHARS = 8_000;   // per-message content cap
// Thesis prompts inject BM25-retrieved chunks as context. 40 K chars (~10 K tokens)
// is sufficient for full-chapter coverage and stays well under Groq's free-tier TPM.
// Raise back to 80_000 only when using a paid API key with higher token limits.
const MAX_SYSTEM_PROMPT_CHARS = 40_000;

const OPENAI_URL      = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_URL  = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL        = 'https://api.groq.com/openai/v1/chat/completions';
const NVIDIA_URL      = 'https://integrate.api.nvidia.com/v1/chat/completions';

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai:          'OpenAI',
  openrouter:      'OpenRouter',
  groq:            'Groq',
  nvidia_deepseek: 'DeepSeek R1',
  nvidia_glm:      'GLM-4',
  kimi:            'Kimi (Moonshot)',
};

export const FALLBACK_SEQUENCE: Provider[] = [
  'groq',            // primary: fast, 30K TPM on free tier, confirmed reachable
  'openai',          // paid backup: skipped if network-unreachable (8s timeout)
  'openrouter',      // free fallback: 429 if quota exhausted
  'nvidia_deepseek', // NVIDIA NIM fallback
  'nvidia_glm',      // NVIDIA NIM fallback (uses Meta Llama 3.3)
  'kimi',            // last resort via OpenRouter
];

export const VALID_PROVIDERS: Provider[] = Object.keys(PROVIDER_LABELS) as Provider[];

export function safeMaxTokens(raw: unknown): number {
  return Math.min(Math.max(Number(raw) || 2000, 1), MAX_ALLOWED_TOKENS);
}

export function safeMessages(msgs: unknown): ChatMessage[] {
  if (!Array.isArray(msgs)) return [];
  return (msgs as ChatMessage[])
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: String(m.content ?? '').slice(0, MAX_MSG_CONTENT_CHARS),
    }));
}

export function safeSystemPrompt(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  return raw.slice(0, MAX_SYSTEM_PROMPT_CHARS);
}

export function sanitizeUpstreamError(status: number, provider: string): string {
  const label = PROVIDER_LABELS[provider as Provider] || provider;
  if (status === 401)
    return `Authentication failed for ${label}. Contact the site administrator.`;
  if (status === 402)
    return `${label}: The requested model is not available on the free tier. Try switching to another provider.`;
  if (status === 404)
    return `${label}: The AI model was not found. It may have been removed or renamed.`;
  if (status === 429)
    return `${label} has exhausted its quota or is rate-limited. Please switch to another AI provider or try again later.`;
  if (status >= 500)
    return `${label} is temporarily unavailable. Please try another provider.`;
  return `The request to ${label} could not be completed (HTTP ${status}).`;
}

export function configPayload() {
  return {
    openai:          Boolean(process.env.OPENAI_API_KEY),
    openrouter:      Boolean(process.env.OPENROUTER_API_KEY),
    groq:            Boolean(process.env.GROQ_API_KEY),
    nvidia_deepseek: Boolean(process.env.NVIDIA_API_KEY),
    nvidia_glm:      Boolean(process.env.NVIDIA_API_KEY),
    defaultProvider: process.env.LLM_PROVIDER || 'openrouter',
  };
}

export function getProviderConfig(provider: Provider): ProviderConfig {
  if (provider === 'openai') {
    return {
      url: OPENAI_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      envName: 'OPENAI_API_KEY',
      extraHeaders: {},
    };
  }
  if (provider === 'groq') {
    return {
      url: GROQ_URL,
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      envName: 'GROQ_API_KEY',
      extraHeaders: {},
    };
  }
  if (provider === 'nvidia_deepseek') {
    return {
      url: NVIDIA_URL,
      apiKey: process.env.NVIDIA_API_KEY,
      // deepseek-r1-0528 was a date-versioned alias that NVIDIA NIM removed.
      // Use the stable model ID instead.
      model: process.env.NVIDIA_DEEPSEEK_MODEL || 'deepseek-ai/deepseek-r1',
      envName: 'NVIDIA_API_KEY',
      extraHeaders: {},
    };
  }
  if (provider === 'nvidia_glm') {
    return {
      url: NVIDIA_URL,
      apiKey: process.env.NVIDIA_API_KEY,
      // zhipuai/glm-4-9b is not on NVIDIA NIM; using Meta Llama as fallback.
      model: process.env.NVIDIA_GLM_MODEL || 'meta/llama-3.3-70b-instruct',
      envName: 'NVIDIA_API_KEY',
      extraHeaders: {},
    };
  }
  if (provider === 'kimi') {
    // Route Kimi via OpenRouter using a free-tier model
    // moonshotai/moonshot-v1-8k requires credits; use mistral-7b-instruct:free instead
    return {
      url: OPENROUTER_URL,
      apiKey: process.env.OPENROUTER_API_KEY,
      model: 'mistralai/mistral-7b-instruct:free',
      envName: 'OPENROUTER_API_KEY',
      extraHeaders: {
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-OpenRouter-Title': APP_TITLE,
      },
    };
  }
  // openrouter (default)
  return {
    url: OPENROUTER_URL,
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash:free',
    envName: 'OPENROUTER_API_KEY',
    extraHeaders: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-OpenRouter-Title': APP_TITLE,
    },
  };
}

export async function chatCompletion({
  url,
  apiKey,
  model,
  systemPrompt,
  messages,
  maxTokens,
  extraHeaders = {},
  provider,
}: ChatCompletionParams): Promise<string> {
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.4, messages: chatMessages }),
  });

  const data = await response.json();

  if (!response.ok) {
    const err: LlmError = new Error(sanitizeUpstreamError(response.status, provider));
    err.status = response.status;
    throw err;
  }

  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from model');
  }
  return text;
}

export async function resolveProviderChat({
  provider,
  systemPrompt,
  messages,
  maxTokens,
}: ResolveProviderChatParams): Promise<string> {
  const cfg = getProviderConfig(provider);
  if (!cfg.apiKey) {
    const err: LlmError = new Error(
      `${PROVIDER_LABELS[provider]} API key (${cfg.envName}) is not configured on the server.`
    );
    err.status = 500;
    throw err;
  }
  return chatCompletion({
    url: cfg.url,
    apiKey: cfg.apiKey,
    model: cfg.model,
    systemPrompt,
    messages,
    maxTokens,
    extraHeaders: cfg.extraHeaders,
    provider,
  });
}
