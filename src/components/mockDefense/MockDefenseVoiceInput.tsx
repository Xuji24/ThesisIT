'use client';

import { Mic, MicOff, VolumeX, RotateCcw, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons';
import type { MockDefenseSession } from './useMockDefense';

type VoiceInputProps = Pick<
  MockDefenseSession,
  | 'speech'
  | 'synth'
  | 'recorder'
  | 'audioRef'
  | 'isPlayingBack'
  | 'setIsPlayingBack'
  | 'hasRecording'
  | 'aiIsSpeaking'
  | 'loading'
  | 'toggleMic'
  | 'handleRetry'
  | 'togglePlayback'
  | 'sendVoiceReply'
>;

export default function MockDefenseVoiceInput({
  speech,
  synth,
  recorder,
  audioRef,
  isPlayingBack,
  setIsPlayingBack,
  hasRecording,
  aiIsSpeaking,
  loading,
  toggleMic,
  handleRetry,
  togglePlayback,
  sendVoiceReply,
}: VoiceInputProps) {
  return (
    <div className="shrink-0 border-t px-5 py-4 bg-surface-card border-line-hairline">
      {!speech.isSupported ? (
        <p className="text-xs text-ink-muted text-center py-2">
          Voice input is not supported in this browser. Switch to Chat mode.
        </p>
      ) : aiIsSpeaking ? (
        <div className="flex items-center justify-center py-1">
          <button
            type="button"
            onClick={synth.cancel}
            className="flex items-center gap-1.5 text-xs text-accent-hover hover:text-accent border border-accent/20 hover:border-accent/40 hover:bg-accent-soft rounded-full px-4 py-1.5 transition-colors"
          >
            <VolumeX className="w-3 h-3" />
            Skip
          </button>
        </div>
      ) : speech.isListening ? (
        <div className="flex items-center justify-center gap-3 py-0.5">
          <button
            type="button"
            onClick={toggleMic}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors"
          >
            <MicOff className="w-3.5 h-3.5" />
            Stop Recording
          </button>
        </div>
      ) : hasRecording ? (
        <div className="flex items-center justify-center gap-2 py-0.5 flex-wrap">
          {recorder.audioURL && (
            <button
              type="button"
              onClick={togglePlayback}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                isPlayingBack
                  ? 'bg-ink-primary text-white border-ink-primary'
                  : 'bg-surface-card text-ink-secondary border-line-strong hover:border-ink-muted'
              }`}
            >
              {isPlayingBack ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlayingBack ? 'Pause' : 'Play Back'}
            </button>
          )}
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-accent-hover border border-accent/20 hover:border-accent/40 hover:bg-accent-soft bg-surface-card transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Re-record
          </button>
          <Button
            type="button"
            size="sm"
            onClick={sendVoiceReply}
            disabled={loading || !speech.transcriptRef.current.trim()}
            className="px-5 text-xs"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <SpinnerIcon className="w-3 h-3" />
                Sending…
              </span>
            ) : (
              'Send Answer'
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-0.5">
          <button
            type="button"
            onClick={toggleMic}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            Start Speaking
          </button>
          <p className="text-center text-[11px] text-accent-hover/70">Or tap the orb above</p>
        </div>
      )}

      {recorder.audioURL && (
        <audio
          key={recorder.audioURL}
          ref={audioRef}
          src={recorder.audioURL}
          onEnded={() => setIsPlayingBack(false)}
        />
      )}
    </div>
  );
}
