import type { NextRequest } from 'next/server';

export const maxDuration = 30;

// ─── Text helpers ─────────────────────────────────────────────────────────────

/** Strip Markdown so TTS engines don't read out "asterisk asterisk bold asterisk asterisk". */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')     // **bold**
    .replace(/\*([\s\S]*?)\*/g, '$1')         // *italic*
    .replace(/_{1,2}([\s\S]*?)_{1,2}/g, '$1') // __underline__
    .replace(/^#{1,6}\s+/gm, '')              // # headings
    .replace(/^[-*+]\s+/gm, '')              // bullet list items
    .replace(/^\d+\.\s+/gm, '')              // numbered list items
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')       // [link text](url)
    .replace(/`{1,3}[^`]*`{1,3}/g, '')       // `code`
    .replace(/\n{3,}/g, '\n\n')              // collapse excess newlines
    .trim();
}

/** Wrap plain text in SSML for Google Cloud TTS: adds natural pauses at sentence boundaries. */
function toSSML(text: string): string {
  // Sentence-boundary pause: 450 ms after period/exclamation/question
  const ssmlBody = text
    .replace(/([.!?])\s+/g, '$1<break time="450ms"/> ')
    .replace(/([,;:])\s+/g, '$1<break time="200ms"/> ')
    .replace(/\n+/g, '<break time="600ms"/>');
  return `<speak>${ssmlBody}</speak>`;
}

// ─── Provider helpers ─────────────────────────────────────────────────────────

async function tryElevenLabs(text: string): Promise<Response | null> {
  const key     = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel — warm professional female
  if (!key) return null;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': key,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability:        0.55,
          similarity_boost: 0.75,
          style:            0.20,   // slight expressive style
          use_speaker_boost: true,
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[TTS] ElevenLabs returned HTTP ${res.status}`);
      return null;
    }
    const buf    = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    console.info('[TTS] ElevenLabs ✓');
    return Response.json({ audioBase64: base64, mimeType: 'audio/mpeg', provider: 'elevenlabs' });
  } catch (e) {
    console.warn('[TTS] ElevenLabs error:', (e as Error).message);
    return null;
  }
}

async function tryGoogleTTS(text: string): Promise<Response | null> {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) return null;

  try {
    const ssml     = toSSML(text);
    const voiceName = process.env.GOOGLE_TTS_VOICE || 'en-US-Neural2-F'; // clear female educator voice
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input:       { ssml },
          voice:       { languageCode: 'en-US', name: voiceName },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92, pitch: 0.0 },
        }),
      },
    );
    if (!res.ok) {
      console.warn(`[TTS] Google Cloud TTS returned HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    console.info('[TTS] Google Cloud TTS ✓');
    return Response.json({ audioBase64: data.audioContent, mimeType: 'audio/mpeg', provider: 'google' });
  } catch (e) {
    console.warn('[TTS] Google Cloud TTS error:', (e as Error).message);
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const raw = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!raw) {
    return Response.json({ error: 'text is required.' }, { status: 400 });
  }

  const clean = stripMarkdown(raw);

  // Provider waterfall: ElevenLabs → Google Cloud TTS → browser fallback
  const elevenlabs = await tryElevenLabs(clean);
  if (elevenlabs) return elevenlabs;

  const google = await tryGoogleTTS(clean);
  if (google) return google;

  // No API keys configured — tell the client to use browser SpeechSynthesis
  console.info('[TTS] No API keys found — returning browser fallback.');
  return Response.json({ fallback: true, provider: 'browser', cleanText: clean });
}
