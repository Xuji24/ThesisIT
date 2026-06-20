'use client';

import { Download, MessageSquare, Mic, BarChart2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons';
import type { MockDefenseSession } from './useMockDefense';

type HeaderProps = Pick<
  MockDefenseSession,
  | 'difficulty'
  | 'questionLimit'
  | 'panelQCount'
  | 'isSessionComplete'
  | 'mode'
  | 'synth'
  | 'messages'
  | 'loading'
  | 'showTranscript'
  | 'setShowTranscript'
  | 'evalReport'
  | 'view'
  | 'setView'
  | 'evaluateSession'
  | 'isEvaluating'
  | 'resetSession'
  | 'saveSession'
  | 'replayLastQuestion'
>;

export default function MockDefenseSessionHeader(props: HeaderProps) {
  const {
    difficulty,
    questionLimit,
    panelQCount,
    isSessionComplete,
    mode,
    synth,
    messages,
    loading,
    showTranscript,
    setShowTranscript,
    evalReport,
    view,
    setView,
    evaluateSession,
    isEvaluating,
    resetSession,
    saveSession,
    replayLastQuestion,
  } = props;

  return (
    <div className="shrink-0 px-6 lg:px-8 py-3 border-b border-neutral-100 flex items-center gap-3 flex-wrap">
      <span className="text-xs text-neutral-500">
        Difficulty: <span className="font-semibold text-neutral-900">{difficulty}</span>
      </span>

      {questionLimit > 0 && (
        <span className="text-xs text-neutral-500">
          Q:{' '}
          <span className={`font-semibold ${isSessionComplete ? 'text-amber-600' : 'text-neutral-900'}`}>
            {panelQCount}/{questionLimit}
          </span>
        </span>
      )}

      <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 select-none">
        {mode === 'voice' ? (
          <>
            <Mic className="w-3 h-3" strokeWidth={2} /> Voice
          </>
        ) : (
          <>
            <MessageSquare className="w-3 h-3" strokeWidth={2} /> Chat
          </>
        )}
      </span>

      {mode === 'voice' && synth.provider && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 select-none">
          {synth.provider === 'elevenlabs' && 'ElevenLabs'}
          {synth.provider === 'google' && 'Google TTS'}
          {synth.provider === 'browser' && 'Browser TTS'}
        </span>
      )}

      {mode === 'voice' && (
        <div className="flex items-center gap-1.5">
          {messages.some((m) => m.role === 'assistant') && !loading && (
            <button
              type="button"
              title="Replay last question"
              onClick={replayLastQuestion}
              className="px-2.5 py-1 rounded-full text-xs font-medium border bg-neutral-100 text-neutral-500 border-transparent hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-150"
              aria-label="Replay last panel question"
            >
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" strokeWidth={2.5} />
                Replay
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
              showTranscript
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-neutral-100 text-neutral-500 border-transparent hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            ≡ Transcript
          </button>
        </div>
      )}

      {evalReport && (
        <div className="flex items-center gap-1 bg-neutral-100 rounded-full p-0.5">
          {(['transcript', 'evaluation'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                view === v ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {v === 'evaluation' ? (
                <span className="flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" strokeWidth={2} />
                  Evaluation
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" strokeWidth={2} />
                  Transcript
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {messages.length > 2 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={evaluateSession}
          disabled={isEvaluating || loading}
          className="text-xs rounded-full ml-auto"
        >
          {isEvaluating ? (
            <span className="flex items-center gap-1.5">
              <SpinnerIcon className="w-3.5 h-3.5" />
              Evaluating…
            </span>
          ) : (
            'End & Evaluate'
          )}
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={resetSession}
        className={`${messages.length > 2 ? '' : 'ml-auto'} text-xs text-neutral-400 hover:text-neutral-700 px-0 underline underline-offset-2`}
      >
        New Session
      </Button>

      {messages.length > 0 && (
        <button
          type="button"
          onClick={saveSession}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 transition-colors ml-2"
          title="Save transcript"
        >
          <Download className="w-3.5 h-3.5" />
          Save
        </button>
      )}
    </div>
  );
}
