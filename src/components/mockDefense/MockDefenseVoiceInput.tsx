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
    <div className="shrink-0 border-t px-5 py-4 bg-white border-neutral-100">
      {!speech.isSupported ? (
        <p className="text-xs text-neutral-400 text-center py-2">
          Voice input is not supported in this browser. Switch to Chat mode.
        </p>
      ) : aiIsSpeaking ? (
        <div className="flex items-center justify-center py-1">
          <button
            type="button"
            onClick={synth.cancel}
            className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-full px-4 py-1.5 transition-colors"
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-200/60 transition-colors"
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
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
              }`}
            >
              {isPlayingBack ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlayingBack ? 'Pause' : 'Play Back'}
            </button>
          )}
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-emerald-700 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 bg-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Re-record
          </button>
          <Button
            type="button"
            size="sm"
            onClick={sendVoiceReply}
            disabled={loading || !speech.transcriptRef.current.trim()}
            className="rounded-full px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200/50"
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-200/60 transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            Start Speaking
          </button>
          <p className="text-center text-[11px] text-emerald-600/70">Or tap the orb above</p>
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
