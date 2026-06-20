'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechSynthesisErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ─── useSpeechRecognition ─────────────────────────────────────────────────────

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  /** Ref that always holds the latest full transcript (base + interim).
   *  Read this directly in event handlers to avoid stale-closure / async-
   *  setState gaps — e.g. when snapshotting on "stop mic". */
  transcriptRef: React.RefObject<string>;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef    = useRef<SpeechRecognitionInstance | null>(null);
  const baseTranscriptRef = useRef('');
  const shouldListenRef   = useRef(false);
  const spawnRecRef       = useRef<() => void>(() => {});
  // ── KEY FIX: tracks the most recent interim text so it is NOT lost when
  // Chrome auto-fires onend (which happens after every 2–3 words even in
  // continuous mode). We save it to baseTranscriptRef before restarting so
  // the full sentence accumulates correctly across multiple onend cycles.
  const lastInterimRef    = useRef('');
  // Live transcript ref — always contains the freshest value regardless of
  // React's async re-render cycle. Use this in event handlers that cannot
  // wait for a re-render (e.g. capturing the answer on "stop mic").
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    setIsSupported(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    );
  }, []);

  const spawnRec = useCallback(() => {
    if (!shouldListenRef.current) return;

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous     = true;
    rec.interimResults = true;
    // Use the user's browser language so Filipino English / accented speech
    // is handled by the OS-level model, not forced through en-US.
    rec.lang = navigator.language || 'en-US';

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const part = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          baseTranscriptRef.current += part + ' ';
          lastInterimRef.current     = ''; // finalized — no longer interim
        } else {
          interim += part;
        }
      }
      lastInterimRef.current = interim; // always keep the latest interim snapshot
      const full = (baseTranscriptRef.current + interim).trimStart();
      transcriptRef.current  = full;   // ref updated synchronously — never stale
      setTranscript(full);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        shouldListenRef.current = false;
        setIsListening(false);
      }
      // 'no-speech' / 'aborted' / 'network' — handled by onend auto-restart below
    };

    rec.onend = () => {
      if (shouldListenRef.current) {
        // Save any interim text that was in-flight when Chrome ended the session.
        // Without this, every 2–3 words the latest phrase is silently dropped.
        const pending = lastInterimRef.current.trim();
        if (pending) {
          baseTranscriptRef.current += pending + ' ';
          lastInterimRef.current     = '';
          setTranscript(baseTranscriptRef.current.trimStart());
        }
        // Shorter restart gap (80 ms instead of 150 ms) so fewer syllables
        // fall into the silence window between the two recognition instances.
        setTimeout(() => spawnRecRef.current(), 80);
      } else {
        // Manual stop: Chrome sometimes fires one last onresult (with a final
        // phrase) AFTER rec.stop() is called. That onresult updates
        // baseTranscriptRef and clears lastInterimRef, so re-flushing here is
        // a no-op in the common case but catches the rare late-result edge case.
        const latePending = lastInterimRef.current.trim();
        if (latePending) {
          baseTranscriptRef.current += latePending + ' ';
          lastInterimRef.current     = '';
          const full                 = baseTranscriptRef.current.trimStart();
          transcriptRef.current      = full;
          setTranscript(full);
        }
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      // start() throws if a previous instance is still alive — safe to ignore
    }
  }, []);

  spawnRecRef.current = spawnRec;

  const startListening = useCallback(() => {
    if (!isSupported || shouldListenRef.current) return;
    baseTranscriptRef.current = '';
    lastInterimRef.current    = '';
    transcriptRef.current     = '';
    shouldListenRef.current   = true;
    spawnRecRef.current();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false; // prevent auto-restart in onend
    // Flush any in-flight interim text into the base before the instance dies.
    // Without this, words the user was speaking at the exact moment they tap
    // "stop" are lost because onend only flushes when shouldListenRef is true.
    const pending = lastInterimRef.current.trim();
    if (pending) {
      baseTranscriptRef.current += pending + ' ';
      lastInterimRef.current     = '';
      const full                 = baseTranscriptRef.current.trimStart();
      transcriptRef.current      = full;
      setTranscript(full);
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    baseTranscriptRef.current = '';
    lastInterimRef.current    = '';
    transcriptRef.current     = '';
    setTranscript('');
  }, []);

  // Abort on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { isSupported, isListening, transcript, transcriptRef, startListening, stopListening, clearTranscript };
}

// ─── useSpeechSynthesis ───────────────────────────────────────────────────────

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  /** Full text currently being read aloud by the browser TTS engine.
   *  Empty string when not speaking. Use this to show live subtitles. */
  spokenText: string;
  speak: (text: string) => void;
  cancel: () => void;
}

const PREFERRED_VOICES = [
  'Google UK English Male',
  'Microsoft David - English (United States)',
  'Microsoft David Desktop - English (United States)',
  'Daniel (Enhanced)',
  'Daniel',
  'Alex',
];

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang.startsWith('en') && !v.localService === false) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0] ??
    null
  );
}

// Chrome has a well-known Speech Synthesis bug: utterances longer than ~200
// characters (roughly 15 seconds of speech) are silently cut off or never
// start. The fix is to split the text into short sentences and chain them via
// onend so only one short utterance plays at a time.
function splitIntoChunks(text: string): string[] {
  // Split on sentence-ending punctuation followed by whitespace, or on
  // hard line-breaks, then merge consecutive tiny fragments so we don't
  // spam the speech queue with single-word utterances.
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

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [spokenText, setSpokenText]   = useState('');
  const cancelledRef                  = useRef(false);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    cancelledRef.current = false;
    setSpokenText(text); // expose full text immediately for subtitle display

    const chunks = splitIntoChunks(text);
    let idx = 0;

    const speakNext = () => {
      if (cancelledRef.current || idx >= chunks.length) {
        setIsSpeaking(false);
        setSpokenText('');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[idx++]);
      utterance.rate   = 0.88;
      utterance.pitch  = 0.85;
      utterance.volume = 1;

      const voice = pickVoice();
      if (voice) utterance.voice = voice;

      if (idx === 1) utterance.onstart = () => setIsSpeaking(true);
      utterance.onend   = speakNext;
      utterance.onerror = (e) => {
        // 'interrupted' fires when cancel() was called — not an error
        if ((e as SpeechSynthesisErrorEvent).error !== 'interrupted') {
          setIsSpeaking(false);
          setSpokenText('');
        }
      };
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      speakNext();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speakNext();
      };
    }
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined') {
      cancelledRef.current = true;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpokenText('');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, []);

  return { isSpeaking, spokenText, speak, cancel };
}

// ─── useAudioRecorder ─────────────────────────────────────────────────────────

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioURL: string | null;
  /** 7 frequency-band amplitude values in [0, 1], updated ~60fps while recording.
   *  All zeros when not recording. Use these to drive a waveform animation. */
  audioLevels: number[];
  /** Live AnalyserNode from the mic stream — available while isRecording is true.
   *  Pass this to VoiceOrb so the orb reacts to the user's real mic amplitude. */
  analyserNode: AnalyserNode | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  clearAudio: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording]   = useState(false);
  const [audioURL, setAudioURL]         = useState<string | null>(null);
  const [audioLevels, setAudioLevels]   = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const discardRef        = useRef(false);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const rafIdRef          = useRef<number | null>(null);

  const revokeURL = (url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };

  const stopAnalyser = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setAnalyserNode(null);
    setAudioLevels([0, 0, 0, 0, 0, 0, 0]);
  };

  const startRecording = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      discardRef.current  = false;
      chunksRef.current   = [];

      // ── Audio analyser for waveform ──────────────────────────────────────
      try {
        const ctx      = new AudioContext();
        // Resume immediately — some browsers start AudioContext in 'suspended'
        // state even when created inside a user-gesture handler, causing
        // getByteFrequencyData() to return all-zeros until resumed.
        if (ctx.state === 'suspended') await ctx.resume();
        const analyser = ctx.createAnalyser();
        analyser.fftSize              = 512;   // 256 bins → ~86 Hz/bin at 44100
        analyser.smoothingTimeConstant = 0.5;  // faster attack for reactive orb
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        setAnalyserNode(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        // Sample 7 bins from the voice-frequency range (skip DC bin 0)
        const BINS = [1, 2, 3, 5, 8, 12, 18];

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const levels = BINS.map((b) =>
            Math.min(1, (dataArray[b] ?? 0) / 180),
          );
          setAudioLevels(levels);
          rafIdRef.current = requestAnimationFrame(tick);
        };
        rafIdRef.current = requestAnimationFrame(tick);
      } catch {
        // AudioContext not available (e.g. secure context required) — silently skip waveform
      }

      // ── MediaRecorder for playback ────────────────────────────────────────
      // Pick the first MIME type the browser actually supports.
      // Using the recorder's own mimeType when building the blob is critical:
      // hardcoding 'audio/webm' on a browser that recorded 'audio/ogg' means
      // the <audio> element cannot decode the data and play() silently fails.
      const preferredMime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm'             :
        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus'  :
        '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      // After construction, recorder.mimeType is the browser's canonical value.
      const actualMime = recorder.mimeType || 'audio/webm';

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopAnalyser();
        if (!discardRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: actualMime });
          const url  = URL.createObjectURL(blob);
          setAudioURL((prev) => { revokeURL(prev); return url; });
        }
        discardRef.current = false;
        setIsRecording(false);
      };

      // timeslice=100 ms → ondataavailable fires every 100 ms while recording.
      // Without a timeslice it only fires once on stop(), so short recordings
      // can produce zero-length chunks and an unplayable blob.
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      stopAnalyser();
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      stopAnalyser();
      setIsRecording(false);
    }
  }, []);

  const cancelRecording = useCallback(() => {
    discardRef.current = true;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      stopAnalyser();
      setIsRecording(false);
    }
  }, []);

  const clearAudio = useCallback(() => {
    setAudioURL((prev) => { revokeURL(prev); return null; });
  }, []);

  useEffect(() => {
    return () => {
      discardRef.current = true;
      stopAnalyser();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setAudioURL((prev) => { revokeURL(prev); return null; });
    };
  }, []);

  return { isRecording, audioURL, audioLevels, analyserNode, startRecording, stopRecording, cancelRecording, clearAudio };
}
