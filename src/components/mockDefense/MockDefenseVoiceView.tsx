'use client';

import { useRef, useState, useEffect } from 'react';
import VoiceOrb from '@/components/VoiceOrb';
import { VOICE_ORB_SIZE_MAX, VOICE_ORB_SIZE_MIN } from './constants';
import type { MockDefenseSession } from './useMockDefense';

type VoiceViewProps = Pick<
  MockDefenseSession,
  | 'loading'
  | 'aiIsSpeaking'
  | 'speech'
  | 'hasRecording'
  | 'synth'
  | 'recorder'
  | 'toggleMic'
>;

/** Reserve space for status line, transcript box, gaps, and padding. */
const LAYOUT_RESERVED_PX = 190;

export default function MockDefenseVoiceView({
  loading,
  aiIsSpeaking,
  speech,
  hasRecording,
  synth,
  recorder,
  toggleMic,
}: VoiceViewProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [orbSize, setOrbSize] = useState(300);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    const update = () => {
      const { clientHeight, clientWidth } = el;
      const byHeight = clientHeight - LAYOUT_RESERVED_PX;
      const byWidth = clientWidth - 40;
      const next = Math.min(VOICE_ORB_SIZE_MAX, byHeight, byWidth);
      setOrbSize(Math.round(Math.max(VOICE_ORB_SIZE_MIN, next)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canTapOrb = !loading && !aiIsSpeaking && !hasRecording;

  return (
    <div
      ref={areaRef}
      className="flex-1 min-h-0 overflow-y-auto scrollbar-brand bg-white"
    >
      <div className="flex flex-col items-center gap-3 px-4 py-4 w-full max-w-lg mx-auto">
        <div
          role={canTapOrb ? 'button' : undefined}
          tabIndex={canTapOrb ? 0 : undefined}
          aria-label="Tap to speak"
          onClick={canTapOrb ? toggleMic : undefined}
          onKeyDown={(e) => {
            if (canTapOrb && (e.key === 'Enter' || e.key === ' ')) toggleMic();
          }}
          className={[
            'shrink-0 transition-all duration-500 select-none',
            loading ? 'cursor-wait' : canTapOrb ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
        >
          <VoiceOrb
            isUserSpeaking={speech.isListening}
            isAISpeaking={aiIsSpeaking}
            isLoading={loading}
            analyserNode={aiIsSpeaking ? (synth.analyserNode ?? recorder.analyserNode) : recorder.analyserNode}
            size={orbSize}
          />
        </div>

        {loading ? (
          <div className="shrink-0 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <p className="text-[11px] uppercase tracking-widest text-emerald-600 font-medium">Processing…</p>
          </div>
        ) : !aiIsSpeaking && !speech.isListening && !hasRecording ? (
          <p className="shrink-0 text-[11px] uppercase tracking-widest text-emerald-600/80 font-medium text-center">
            Tap orb or Start below to speak
          </p>
        ) : null}

        <div className="shrink-0 w-full min-h-[88px] max-h-[112px] overflow-y-auto scrollbar-brand rounded-xl border border-emerald-100/80 bg-emerald-50/40 px-4 py-3 flex items-start justify-center">
          {loading ? (
            <p className="text-sm text-neutral-400 text-center thinking-dots self-center w-full">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </p>
          ) : synth.spokenText ? (
            <p key={synth.spokenText} className="text-justify text-sm text-neutral-700 leading-relaxed w-full">
              {synth.spokenText.trim().split(/\s+/).map((word, i) => (
                <span key={i} className="lyric-word mr-[0.3em]" style={{ animationDelay: `${i * 0.05}s` }}>
                  {word}
                </span>
              ))}
            </p>
          ) : speech.transcript ? (
            <p className="text-justify text-sm text-emerald-700 leading-relaxed w-full">
              {speech.transcript.trim().split(/\s+/).map((word, i) => (
                <span key={i} className="lyric-word mr-[0.3em]" style={{ animationDelay: `${i * 0.04}s` }}>
                  {word}
                </span>
              ))}
            </p>
          ) : speech.isListening ? (
            <p className="text-[11px] uppercase tracking-widest text-emerald-600 font-medium animate-pulse self-center w-full text-center">
              Listening…
            </p>
          ) : (
            <p className="text-[11px] text-neutral-300 self-center w-full text-center select-none">
              Transcript will appear here
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
