'use client';

/**
 * useTTS — unified Text-to-Speech hook for Mock Defense voice mode.
 *
 * Provider waterfall (auto-activates the moment an API key is added to .env):
 *   1. ElevenLabs  (ELEVENLABS_API_KEY)  — highest quality neural voice
 *   2. Google Cloud TTS (GOOGLE_TTS_API_KEY) — Neural2 / free tier
 *   3. Browser SpeechSynthesis            — always available, zero setup
 *
 * Exposes an `analyserNode` so VoiceOrb reacts to API audio in real-time.
 * When the browser fallback is used, `analyserNode` is null (orb uses the
 * `isAISpeaking` boolean for its gentle idle animation instead).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Improved browser voice selection ────────────────────────────────────────
// Priority order: high-quality neural/online voices first, then desktop voices.
const PREFERRED_VOICES = [
  // Chrome / Edge on Windows — online neural voices (best quality)
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft Libby Online (Natural) - English (United Kingdom)',
  // Chrome on any OS
  'Google US English',
  'Google UK English Female',
  'Google UK English Male',
  // macOS / iOS — Siri voices (very natural)
  'Samantha',                 // macOS default — clear female
  'Karen',                    // Australian female
  'Daniel (Enhanced)',        // UK male enhanced
  'Daniel',
  // Windows desktop
  'Microsoft Zira - English (United States)',
  'Microsoft David - English (United States)',
  // Generic fallback
  'Alex',
];

function pickBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  // Any remote (cloud) English voice
  const remote = voices.find((v) => v.lang.startsWith('en') && !v.localService);
  if (remote) return remote;
  // Any English voice
  return voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null;
}

// ─── Text chunking for Chrome's ~200-char TTS bug ────────────────────────────
function splitIntoChunks(text: string): string[] {
  const raw = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|(?<=\n)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  for (const part of raw) {
    if (current.length + part.length < 200) {
      current += (current ? ' ' : '') + part;
    } else {
      if (current) chunks.push(current);
      current = part;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text];
}

// ─── Public interface ─────────────────────────────────────────────────────────

export type TTSProvider = 'elevenlabs' | 'google' | 'browser';

export interface UseTTSReturn {
  isSpeaking:   boolean;
  /** Full sentence currently being spoken — use for lyric subtitle display. */
  spokenText:   string;
  /** Live AnalyserNode from the API audio context (null when browser TTS is used).
   *  Pass this to VoiceOrb so the orb reacts to the actual audio waveform. */
  analyserNode: AnalyserNode | null;
  /** Which provider is currently speaking (null when idle). */
  provider:     TTSProvider | null;
  speak:        (text: string) => void;
  cancel:       () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTTS(): UseTTSReturn {
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [spokenText,   setSpokenText]   = useState('');
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [provider,     setProvider]     = useState<TTSProvider | null>(null);

  const cancelledRef  = useRef(false);
  // Synchronous lock — prevents a second speak() call from interrupting an
  // in-progress one and producing the double-voice / glitch artefact.
  // cancel() always clears this lock so the manual Replay button still works.
  const speakLockRef  = useRef(false);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const sourceRef     = useRef<AudioBufferSourceNode | null>(null);

  // ── Cleanup helper ─────────────────────────────────────────────────────────
  const teardownAudio = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setAnalyserNode(null);
  }, []);

  // ── Browser SpeechSynthesis fallback ───────────────────────────────────────
  const browserSpeak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const chunks = splitIntoChunks(text);
    let idx = 0;

    const speakNext = () => {
      if (cancelledRef.current || idx >= chunks.length) {
        if (!cancelledRef.current) {
          speakLockRef.current = false;
          setIsSpeaking(false);
          setSpokenText('');
          setProvider(null);
        }
        return;
      }

      const chunk     = chunks[idx++];
      const utterance = new SpeechSynthesisUtterance(chunk);

      // Voice settings — clear, calm, slightly slower than default
      utterance.rate   = 0.90;
      utterance.pitch  = 1.00;
      utterance.volume = 1.00;

      const voice = pickBrowserVoice();
      if (voice) utterance.voice = voice;

      if (idx === 1) {
        utterance.onstart = () => {
          setIsSpeaking(true);
          setProvider('browser');
        };
      }

      // Update subtitle to the current sentence for lyric animation
      utterance.onstart = () => {
        if (!cancelledRef.current) setSpokenText(chunk);
      };

      utterance.onend = speakNext;

      utterance.onerror = (e) => {
        if ((e as SpeechSynthesisErrorEvent).error !== 'interrupted') {
          setIsSpeaking(false);
          setSpokenText('');
          setProvider(null);
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    setIsSpeaking(true);
    setProvider('browser');

    if (window.speechSynthesis.getVoices().length > 0) {
      speakNext();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speakNext();
      };
    }
  }, []);

  // ── API TTS playback via Web Audio ─────────────────────────────────────────
  const playAudioBase64 = useCallback(async (
    base64: string,
    mimeType: string,
    prov: TTSProvider,
    fullText: string,
  ) => {
    try {
      // Decode base64 → ArrayBuffer
      const binary = atob(base64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const ctx      = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize              = 256;
      analyser.smoothingTimeConstant = 0.8;

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      if (cancelledRef.current) { ctx.close(); return; }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current  = ctx;
      sourceRef.current    = source;
      setAnalyserNode(analyser);
      setProvider(prov);
      setIsSpeaking(true);
      setSpokenText(fullText);

      source.onended = () => {
        if (!cancelledRef.current) {
          speakLockRef.current = false;
          setIsSpeaking(false);
          setSpokenText('');
          setProvider(null);
          setAnalyserNode(null);
        }
        teardownAudio();
      };

      source.start();
      console.info(`[TTS] Playing via ${prov}`);
    } catch (e) {
      console.warn('[TTS] Web Audio playback failed, falling back to browser TTS:', (e as Error).message);
      teardownAudio();
      if (!cancelledRef.current) browserSpeak(fullText);
    }
  }, [browserSpeak, teardownAudio]);

  // ── Main speak entry-point ─────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!text.trim()) return;

    // If the AI is already mid-sentence, silently ignore the duplicate call.
    // This prevents the glitch where a second speak() cancels-and-restarts the
    // current one, producing a double-voice or cut-off artefact.
    // The caller must explicitly call cancel() first if they truly want to restart
    // (e.g. the Replay button already does synth.cancel() → synth.speak()).
    if (speakLockRef.current) return;
    speakLockRef.current = true;

    // Cancel any in-progress speech (safety net for any stale state)
    cancelledRef.current = true;
    teardownAudio();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpokenText('');

    // Small gap so the previous cancel settles before new audio starts
    setTimeout(async () => {
      cancelledRef.current = false;

      try {
        // 6-second timeout — if API is unreachable, fall back immediately
        const abortCtrl = new AbortController();
        const timeout   = setTimeout(() => abortCtrl.abort(), 6_000);

        const res = await fetch('/api/tts', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ text }),
          signal:  abortCtrl.signal,
        });
        clearTimeout(timeout);

        if (cancelledRef.current) return;

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: {
          fallback?:   boolean;
          cleanText?:  string;
          audioBase64?: string;
          mimeType?:   string;
          provider?:   TTSProvider;
        } = await res.json();

        if (cancelledRef.current) return;

        if (data.fallback) {
          browserSpeak(data.cleanText ?? text);
        } else if (data.audioBase64 && data.provider) {
          await playAudioBase64(data.audioBase64, data.mimeType ?? 'audio/mpeg', data.provider, text);
        } else {
          browserSpeak(text);
        }
      } catch {
        if (!cancelledRef.current) {
          console.info('[TTS] API unavailable — using browser SpeechSynthesis.');
          browserSpeak(text);
        }
      }
    }, 80);
  }, [browserSpeak, playAudioBase64, teardownAudio]);

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    // Always release the lock so a subsequent speak() call can proceed
    speakLockRef.current = false;
    teardownAudio();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpokenText('');
    setProvider(null);
    setAnalyserNode(null);
  }, [teardownAudio]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      try { sourceRef.current?.stop(); } catch { /* ok */ }
      audioCtxRef.current?.close().catch(() => {});
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  return { isSpeaking, spokenText, analyserNode, provider, speak, cancel };
}
