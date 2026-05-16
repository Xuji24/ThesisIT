import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';

const APP_TITLE = 'ThesisIT';
const MAX_ALLOWED_TOKENS = 4000;
const MAX_MESSAGES = 20;

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  groq: 'Groq',
};

const VALID_PROVIDERS = Object.keys(PROVIDER_LABELS);

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin: isProd
      ? (process.env.APP_URL || 'https://thesisit.vercel.app').split(',').map((s) => s.trim())
      : process.env.CLIENT_ORIGIN?.split(',').map((s) => s.trim()) || [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ],
    credentials: true,
  }),
);

app.use(express.json({ limit: '512kb' }));

const llmLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait before trying again.' },
});

function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY;
}

function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL || 'openrouter/free';
}

function getGroqKey() {
  return process.env.GROQ_API_KEY;
}

function getGroqModel() {
  return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
}

function safeMaxTokens(raw) {
  return Math.min(Math.max(Number(raw) || 2000, 1), MAX_ALLOWED_TOKENS);
}

function safeMessages(msgs) {
  if (!Array.isArray(msgs)) return [];
  return msgs.slice(-MAX_MESSAGES).map((m) => ({ role: m.role, content: String(m.content ?? '') }));
}

function sanitizeUpstreamError(status, provider) {
  const label = PROVIDER_LABELS[provider] || provider;
  if (status === 401) return `Authentication failed for ${label}. Contact the site administrator.`;
  if (status === 429) return `${label} has exhausted its quota or is rate-limited. Please switch to another AI provider or try again later.`;
  if (status >= 500) return `${label} is temporarily unavailable. Please try another provider.`;
  return `The request to ${label} could not be completed.`;
}

function configPayload() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    openrouter: Boolean(getOpenRouterKey()),
    groq: Boolean(getGroqKey()),
    defaultProvider: process.env.LLM_PROVIDER || 'openrouter',
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', (_req, res) => {
  res.json(configPayload());
});

async function chatCompletion({ url, apiKey, model, systemPrompt, messages, maxTokens, extraHeaders = {}, provider }) {
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
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: chatMessages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(sanitizeUpstreamError(response.status, provider));
    err.status = response.status;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from model');
  }
  return text;
}

async function chatCompletionStream({ url, apiKey, model, systemPrompt, messages, maxTokens, extraHeaders = {}, res, provider }) {
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: chatMessages, stream: true }),
  });

  if (!upstream.ok) {
    res.write(`data: ${JSON.stringify({ error: sanitizeUpstreamError(upstream.status, provider) })}\n\n`);
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
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
      if (data === '[DONE]') {
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
      } catch {
        // skip malformed chunk
      }
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

app.post('/api/chat', llmLimiter, async (req, res) => {
  const { provider, systemPrompt } = req.body || {};
  const maxTokens = safeMaxTokens(req.body?.maxTokens);
  const messages = safeMessages(req.body?.messages);

  if (!systemPrompt) {
    return res.status(400).json({ error: 'systemPrompt is required' });
  }

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` });
  }

  try {
    const text = await resolveProviderChat({ provider, systemPrompt, messages, maxTokens });
    res.json({ text });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message || 'Chat request failed',
    });
  }
});

function getProviderConfig(provider) {
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
      apiKey: getGroqKey(),
      model: getGroqModel(),
      envName: 'GROQ_API_KEY',
      extraHeaders: {},
    };
  }
  // openrouter (default)
  return {
    url: OPENROUTER_URL,
    apiKey: getOpenRouterKey(),
    model: getOpenRouterModel(),
    envName: 'OPENROUTER_API_KEY',
    extraHeaders: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
      'X-OpenRouter-Title': APP_TITLE,
    },
  };
}

async function resolveProviderChat({ provider, systemPrompt, messages, maxTokens }) {
  const cfg = getProviderConfig(provider);
  if (!cfg.apiKey) {
    const err = new Error(`${PROVIDER_LABELS[provider]} API key (${cfg.envName}) is not configured on the server.`);
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

app.post('/api/chat/stream', llmLimiter, async (req, res) => {
  const { provider, systemPrompt } = req.body || {};
  const maxTokens = safeMaxTokens(req.body?.maxTokens);
  const messages = safeMessages(req.body?.messages);

  if (!systemPrompt) return res.status(400).json({ error: 'systemPrompt is required' });
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Disable buffering on Vercel / nginx so chunks reach the client immediately
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const cfg = getProviderConfig(provider);
    if (!cfg.apiKey) {
      res.write(`data: ${JSON.stringify({ error: `${PROVIDER_LABELS[provider]} API key (${cfg.envName}) is not configured` })}\n\n`);
      return res.end();
    }
    await chatCompletionStream({
      url: cfg.url,
      apiKey: cfg.apiKey,
      model: cfg.model,
      systemPrompt,
      messages,
      maxTokens,
      extraHeaders: cfg.extraHeaders,
      res,
      provider,
    });
  } catch (err) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Stream failed' })}\n\n`);
      res.end();
    }
  }
});

// /api/* routes that didn't match anything → JSON 404 (never HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Express error handler for /api/* → always return JSON
// eslint-disable-next-line no-unused-vars
app.use('/api', (err, req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// In self-hosted production, serve the built frontend from /dist.
// On Vercel, the CDN handles static files — skip this entirely.
if (isProd && !process.env.VERCEL) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Export the app so Vercel can use it as a serverless function handler.
export default app;

// Only start the HTTP server when running locally (not on Vercel).
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const cfg = configPayload();
    console.log(`ThesisIT API listening on http://localhost:${PORT}`);
    console.log(`  OpenAI:     ${cfg.openai ? 'ready' : 'missing OPENAI_API_KEY'}`);
    console.log(`  OpenRouter: ${cfg.openrouter ? 'ready' : 'missing OPENROUTER_API_KEY'}`);
    console.log(`  Groq:       ${cfg.groq ? 'ready' : 'missing GROQ_API_KEY'}`);
    if (isProd) console.log('  Serving static frontend from /dist');
  });
}
