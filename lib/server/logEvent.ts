import 'server-only';
import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/database.types';

type EventType = Database['public']['Enums']['event_type'];
/** JSON-safe meta values only -- matches the `events.meta` jsonb column. */
type EventMeta = Record<string, string | number | boolean | null>;

/**
 * Best-effort usage telemetry. Uses the request's own Supabase session (via
 * cookies), so writes go through RLS exactly as if the user made them
 * directly -- no service-role bypass needed, and a signed-out visitor's
 * events naturally aren't logged (auth.uid() is null, the RLS insert policy
 * requires user_id = auth.uid(), event_insert_own would reject a null match).
 *
 * Never pass thesis text, LLM prompt content, or LLM response content in
 * `meta` -- see the hard privacy constraint in redesign-plan.md §9. Counts,
 * labels, durations, and provider names only.
 *
 * Never throws -- usage logging must not be able to break a real request.
 */
export async function logEvent(
  type: EventType,
  meta: EventMeta = {},
  request?: Request,
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // anonymous workspace usage isn't tracked -- see project memory

    const ip = request ? getClientIp(request.headers) : null;

    await supabase.from('events').insert({
      user_id: user.id,
      type,
      meta: meta as Json,
      ip_hash: ip ? hashIp(ip) : null,
      user_agent: request?.headers.get('user-agent')?.slice(0, 300) ?? null,
    });
  } catch {
    // Swallow -- a telemetry failure must never surface to the user or
    // interrupt the actual feature request that triggered it.
  }
}

interface EvalJson {
  overall?: { score?: number; grade?: string };
  criteria?: { id?: string; score?: number }[];
}

/**
 * Best-effort record of a completed mock-defense evaluation into
 * defense_sessions, called once the "Mock Defense — Evaluation" stream
 * finishes. There is no client-provided session id to correlate against
 * (useMockDefense.ts is a frozen guardrail file -- see project memory --
 * so it can't be modified to pass one), so this creates one row per
 * completed evaluation rather than updating an in-progress session:
 *   - `mode` (chat/voice) isn't present anywhere in the evaluation prompt
 *     text, so it can't be derived server-side and defaults to 'chat'.
 *   - `difficulty` and `questions_answered` ARE derivable: the evaluation
 *     systemPrompt embeds "Defense Difficulty: X" and one "QN:" line per
 *     panel question, both extracted by regex below.
 *   - `criteria`/`overall`/`grade` come from the fenced JSON block the
 *     model is instructed to emit (see src/lib/prompts.ts).
 * A future pass that's allowed to touch useMockDefense.ts should pass a
 * real session id through instead of this regex-based reconstruction.
 */
export async function recordDefenseEvaluation(systemPrompt: string, fullResponse: string): Promise<void> {
  try {
    const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/i);
    if (!jsonMatch) return;
    let json: EvalJson;
    try {
      json = JSON.parse(jsonMatch[1]);
    } catch {
      return;
    }
    if (typeof json.overall?.score !== 'number') return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const difficultyMatch = systemPrompt.match(/Defense Difficulty:\s*([^\n]+)/i);
    const difficulty = difficultyMatch?.[1]?.trim() || 'Standard';
    const questionsAnswered = (systemPrompt.match(/\bQ\d+:/g) ?? []).length;

    const criteria: Record<string, number> = {};
    for (const c of json.criteria ?? []) {
      if (c.id && typeof c.score === 'number') criteria[c.id.toUpperCase()] = c.score;
    }

    await supabase.from('defense_sessions').insert({
      user_id: user.id,
      mode: 'chat',
      difficulty,
      questions_answered: questionsAnswered,
      overall_score: json.overall.score,
      grade: json.overall.grade?.toUpperCase() ?? null,
      criteria: criteria as Json,
      ended_at: new Date().toISOString(),
    });
  } catch {
    // Same swallow-on-failure rule as logEvent -- never break the real request.
  }
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}
