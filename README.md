# ThesisIT

AI-powered thesis defense coach — upload a PDF and practice mock defense, get strengths/weaknesses analysis, chat with your manuscript, and revise sections from panel feedback.

## Architecture

| Layer | Role |
|-------|------|
| **React (Vite)** | UI, PDF extraction (browser) |
| **Express API** | Holds API keys, proxies OpenAI & OpenRouter |

API keys never ship to the browser.

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure `.env`

Copy `.env.example` to `.env` and add your keys (**no `VITE_` prefix**):

```env
PORT=3001
LLM_PROVIDER=openrouter

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openrouter/free
```

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI via backend |
| `OPENROUTER_API_KEY` | OpenRouter via backend |
| `LLM_PROVIDER` | Default provider: `openrouter` or `openai` |
| `OPENAI_MODEL` / `OPENROUTER_MODEL` | Optional model IDs |

If you still have `VITE_OPENROUTER_API_KEY` in `.env`, the server will use it as a fallback until you rename it.

### 3. Run (frontend + backend)

```bash
npm run dev
```

This starts:

- **API** — http://localhost:3001  
- **Web** — http://localhost:5173 (proxies `/api` → backend)

Restart after changing `.env`.

### 4. Production

```bash
npm run build
npm run start
```

Serves the built app and API on http://localhost:3001 (set `PORT` if needed).

## Using the app

1. Open http://localhost:5173  
2. Upload a thesis PDF  
3. Switch **AI: OpenRouter / OpenAI** in the dashboard header  
4. Use any tab (Mock Defense, Analysis, Chat, Panel Recos)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Vite dev server |
| `npm run dev:server` | API only |
| `npm run dev:client` | Vite only (needs API running for AI) |
| `npm run build` | Build frontend to `dist/` |
| `npm run start` | Production: API + static `dist/` |
| `npm run preview` | Build + production server |

## Stack

- React + Vite
- Express API
- Tailwind CSS v4
- pdfjs-dist, react-markdown
- OpenAI and/or OpenRouter

See [THESIS_DEFENSE_MVP.md](./THESIS_DEFENSE_MVP.md) for feature scope.
