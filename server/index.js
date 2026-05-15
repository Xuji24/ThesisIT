import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === 'production';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const app = express();

app.use(
  cors({
    origin: isProd
      ? false
      : process.env.CLIENT_ORIGIN?.split(',').map((s) => s.trim()) || [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ],
    credentials: true,
  }),
);

app.use(express.json({ limit: '12mb' }));

function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
}

function configPayload() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    openrouter: Boolean(getOpenRouterKey()),
    defaultProvider: process.env.LLM_PROVIDER || 'openrouter',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    openrouterModel:
      process.env.OPENROUTER_MODEL ||
      process.env.VITE_OPENROUTER_MODEL ||
      'openrouter/free',
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', (_req, res) => {
  res.json(configPayload());
});

async function chatCompletion({ url, apiKey, model, systemPrompt, messages, maxTokens, extraHeaders = {} }) {
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
    const message =
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      response.statusText;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from model');
  }
  return text;
}

async function chatCompletionStream({ url, apiKey, model, systemPrompt, messages, maxTokens, extraHeaders = {}, res }) {
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
    const errData = await upstream.json().catch(() => ({}));
    const msg = errData?.error?.message || upstream.statusText;
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
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

app.post('/api/chat', async (req, res) => {
  const { provider, systemPrompt, messages = [], maxTokens = 2000 } = req.body || {};

  if (!systemPrompt) {
    return res.status(400).json({ error: 'systemPrompt is required' });
  }

  if (!provider || !['openai', 'openrouter'].includes(provider)) {
    return res.status(400).json({ error: 'provider must be "openai" or "openrouter"' });
  }

  try {
    let text;

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'OPENAI_API_KEY is not configured on the server.',
        });
      }
      text = await chatCompletion({
        url: OPENAI_URL,
        apiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        systemPrompt,
        messages,
        maxTokens,
      });
    } else {
      const apiKey = getOpenRouterKey();
      if (!apiKey) {
        return res.status(500).json({
          error: 'OPENROUTER_API_KEY is not configured on the server.',
        });
      }
      text = await chatCompletion({
        url: OPENROUTER_URL,
        apiKey,
        model:
          process.env.OPENROUTER_MODEL ||
          process.env.VITE_OPENROUTER_MODEL ||
          'openrouter/free',
        systemPrompt,
        messages,
        maxTokens,
        extraHeaders: {
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
          'X-OpenRouter-Title': 'ThesisIT',
        },
      });
    }

    res.json({ text });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message || 'Chat request failed',
    });
  }
});

app.post('/api/chat/stream', async (req, res) => {
  const { provider, systemPrompt, messages = [], maxTokens = 2000 } = req.body || {};

  if (!systemPrompt) return res.status(400).json({ error: 'systemPrompt is required' });
  if (!provider || !['openai', 'openrouter'].includes(provider)) {
    return res.status(400).json({ error: 'provider must be "openai" or "openrouter"' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Disable buffering on Vercel / nginx so chunks reach the client immediately
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.write(`data: ${JSON.stringify({ error: 'OPENAI_API_KEY is not configured' })}\n\n`);
        return res.end();
      }
      await chatCompletionStream({
        url: OPENAI_URL,
        apiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        systemPrompt,
        messages,
        maxTokens,
        res,
      });
    } else {
      const apiKey = getOpenRouterKey();
      if (!apiKey) {
        res.write(`data: ${JSON.stringify({ error: 'OPENROUTER_API_KEY is not configured' })}\n\n`);
        return res.end();
      }
      await chatCompletionStream({
        url: OPENROUTER_URL,
        apiKey,
        model: process.env.OPENROUTER_MODEL || process.env.VITE_OPENROUTER_MODEL || 'openrouter/free',
        systemPrompt,
        messages,
        maxTokens,
        extraHeaders: {
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
          'X-OpenRouter-Title': 'ThesisAI',
        },
        res,
      });
    }
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
    if (isProd) console.log('  Serving static frontend from /dist');
  });
}
