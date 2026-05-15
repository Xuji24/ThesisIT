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
          'X-OpenRouter-Title': 'ThesisAI',
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

if (isProd) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  const cfg = configPayload();
  console.log(`ThesisAI API listening on http://localhost:${PORT}`);
  console.log(`  OpenAI:     ${cfg.openai ? 'ready' : 'missing OPENAI_API_KEY'}`);
  console.log(`  OpenRouter: ${cfg.openrouter ? 'ready' : 'missing OPENROUTER_API_KEY'}`);
  if (isProd) console.log('  Serving static frontend from /dist');
});
