import { NextRequest, NextResponse } from 'next/server';
import {
  FALLBACK_SEQUENCE,
  safeMaxTokens,
  safeMessages,
  safeSystemPrompt,
  resolveProviderChat,
  type Provider,
} from '../../../lib/server/llm-providers';
import { isRateLimited, getClientIp } from '../../../lib/server/rate-limit';
import { getCached, setCached } from '../../../lib/server/llm-cache';
import { isProviderCooling, markProviderCooling } from '../../../lib/server/provider-cooldown';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      { status: 429 }
    );
  }

  let body: { systemPrompt?: string; maxTokens?: unknown; messages?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid or empty request body.' }, { status: 400 });
  }

  const systemPrompt = safeSystemPrompt(body?.systemPrompt);
  const maxTokens    = safeMaxTokens(body?.maxTokens);
  const messages     = safeMessages(body?.messages);

  if (!systemPrompt) {
    return NextResponse.json({ error: 'systemPrompt is required' }, { status: 400 });
  }

  // ── B: Cache check ────────────────────────────────────────────────────────
  const cached = getCached(systemPrompt, messages);
  if (cached) {
    return NextResponse.json({ text: cached });
  }

  // ── Fallback loop with C: per-provider cooldown ────────────────────────────
  let lastError: Error | undefined;

  for (const provider of FALLBACK_SEQUENCE) {
    // C: skip providers that are cooling down after a recent failure
    if (isProviderCooling(provider as Provider)) {
      console.warn(`[Fallback] Skipping ${provider} — currently cooling.`);
      continue;
    }

    try {
      const text = await resolveProviderChat({
        provider: provider as Provider,
        systemPrompt,
        messages,
        maxTokens,
      });

      // B: cache successful response
      setCached(systemPrompt, messages, text);
      return NextResponse.json({ text });
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      console.warn(`[Fallback] ${provider} failed: ${e.message}`);
      // C: mark provider cooling based on HTTP status
      if (e.status) markProviderCooling(provider as Provider, e.status, e.message);
      lastError = err as Error;
    }
  }

  const e = lastError as { message?: string; status?: number } | undefined;
  return NextResponse.json(
    { error: e?.message || 'All AI providers are currently unavailable.' },
    { status: e?.status || 500 }
  );
}

