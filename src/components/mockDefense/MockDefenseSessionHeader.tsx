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
    <div className="shrink-0 px-6 lg:px-8 py-3 border-b border-line-hairline flex items-center gap-3 flex-wrap">
      <span className="text-xs text-ink-muted">
        Difficulty: <span className="font-semibold text-ink-primary">{difficulty}</span>
      </span>

      {questionLimit > 0 && (
        <span className="text-xs text-ink-muted">
          Q:{' '}
          <span className={`font-semibold ${isSessionComplete ? 'text-[#8a5a00]' : 'text-ink-primary'}`}>
            {panelQCount}/{questionLimit}
          </span>
        </span>
      )}

      <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-sunken text-ink-secondary select-none">
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-soft text-accent-hover border border-accent/20 select-none">
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
              className="px-2.5 py-1 rounded-full text-xs font-medium border bg-surface-sunken text-ink-muted border-transparent hover:text-accent-hover hover:bg-accent-soft hover:border-accent/20 transition-colors duration-150"
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
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-150 ${
              showTranscript
                ? 'bg-accent-soft text-accent-hover border-accent/20'
                : 'bg-surface-sunken text-ink-muted border-transparent hover:text-accent-hover hover:bg-accent-soft'
            }`}
          >
            ≡ Transcript
          </button>
        </div>
      )}

      {evalReport && (
        <div className="flex items-center gap-1 bg-surface-sunken rounded-full p-0.5">
          {(['transcript', 'evaluation'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                view === v ? 'bg-surface-card text-ink-primary shadow-sm' : 'text-ink-muted hover:text-ink-secondary'
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
          className="text-xs ml-auto"
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
        className={`${messages.length > 2 ? '' : 'ml-auto'} text-xs text-ink-muted hover:text-ink-primary px-0 underline underline-offset-2`}
      >
        New Session
      </Button>

      {messages.length > 0 && (
        <button
          type="button"
          onClick={saveSession}
          className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary transition-colors ml-2"
          title="Save transcript"
        >
          <Download className="w-3.5 h-3.5" />
          Save
        </button>
      )}
    </div>
  );
}
