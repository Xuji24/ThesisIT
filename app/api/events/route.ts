import type { NextRequest } from 'next/server';
import { logEvent } from '../../../lib/server/logEvent';

const ALLOWED_TYPES = new Set(['pdf_upload']);

/**
 * Minimal client-reportable event endpoint. Deliberately narrow: only event
 * types a client can legitimately self-report (pdf_upload happens entirely
 * client-side in src/lib/pdfClient.ts, so there's no server code path to
 * hang telemetry off otherwise) are accepted. Everything else is logged
 * server-side at the point it actually happens (see app/api/chat/stream,
 * app/api/tts) so a client can't fabricate usage events for other types.
 */
export async function POST(request: NextRequest) {
  let body: { type?: string; meta?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const type = typeof body?.type === 'string' ? body.type : '';
  if (!ALLOWED_TYPES.has(type)) {
    return Response.json({ error: 'Unsupported event type.' }, { status: 400 });
  }

  const meta: Record<string, string | number | boolean | null> = {};
  if (body.meta && typeof body.meta === 'object') {
    for (const [k, v] of Object.entries(body.meta)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
        meta[k] = v;
      }
    }
  }

  await logEvent(type as 'pdf_upload', meta, request);
  return Response.json({ ok: true });
}
