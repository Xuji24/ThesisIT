'use client';

import { MessageSquare, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons';
import { DIFFICULTIES, DIFFICULTY_DESCRIPTIONS, LIMIT_OPTIONS } from './constants';
import type { SessionMode } from './types';

interface MockDefenseSetupProps {
  difficulty: string;
  setDifficulty: (d: string) => void;
  questionLimit: number;
  setQuestionLimit: (n: number) => void;
  mode: SessionMode;
  setMode: (m: SessionMode) => void;
  loading: boolean;
  onStart: () => void;
}

export default function MockDefenseSetup({
  difficulty,
  setDifficulty,
  questionLimit,
  setQuestionLimit,
  mode,
  setMode,
  loading,
  onStart,
}: MockDefenseSetupProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col w-full">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-brand px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-ink-primary mb-2">Mock Defense Session</h2>
        <p className="text-sm text-ink-muted mb-10 max-w-sm mx-auto leading-relaxed">
          Simulate a live oral defense. The AI acts as a strict panelist — one question at a
          time, with critical follow-ups on weak answers.
        </p>

        <div className="w-full max-w-sm mb-6 mx-auto">
        <p className="text-[10px] uppercase tracking-widest text-ink-muted font-semibold mb-3">
          Select Difficulty
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <Button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              variant={difficulty === d ? 'default' : 'outline'}
              className="py-3 px-2 rounded-md h-auto transition-colors"
            >
              {d}
            </Button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-ink-muted">
          {DIFFICULTY_DESCRIPTIONS[difficulty as keyof typeof DIFFICULTY_DESCRIPTIONS]}
        </p>
      </div>

        <div className="w-full max-w-sm mb-6 mx-auto">
        <p className="text-[10px] uppercase tracking-widest text-ink-muted font-semibold mb-3">
          Question Limit
        </p>
        <div className="grid grid-cols-5 gap-2">
          {LIMIT_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              onClick={() => setQuestionLimit(opt.value)}
              variant={questionLimit === opt.value ? 'default' : 'outline'}
              className="py-2.5 px-1 rounded-md h-auto text-xs transition-colors"
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {questionLimit === 0
            ? 'No limit — runs until you end the session'
            : `Session ends automatically after ${questionLimit} panel questions`}
        </p>
      </div>

        <div className="w-full max-w-sm mb-4 mx-auto">
        <p className="text-[10px] uppercase tracking-widest text-ink-muted font-semibold mb-3">
          Session Mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={`flex flex-col items-center gap-2 p-4 rounded-md border text-left transition-colors ${
              mode === 'chat'
                ? 'border-accent bg-accent-soft'
                : 'border-line-hairline bg-surface-card hover:border-accent/40'
            }`}
          >
            <MessageSquare className={`w-6 h-6 ${mode === 'chat' ? 'text-accent' : 'text-ink-muted'}`} strokeWidth={1.8} />
            <span className={`text-sm font-semibold ${mode === 'chat' ? 'text-accent-hover' : 'text-ink-secondary'}`}>
              Chat
            </span>
            <span className="text-[11px] text-ink-muted text-center leading-snug">Type your answers</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('voice')}
            className={`flex flex-col items-center gap-2 p-4 rounded-md border text-left transition-colors ${
              mode === 'voice'
                ? 'border-accent bg-accent-soft'
                : 'border-line-hairline bg-surface-card hover:border-accent/40'
            }`}
          >
            <Mic className={`w-6 h-6 ${mode === 'voice' ? 'text-accent' : 'text-ink-muted'}`} strokeWidth={1.8} />
            <span className={`text-sm font-semibold ${mode === 'voice' ? 'text-accent-hover' : 'text-ink-secondary'}`}>
              Voice
            </span>
            <span className="text-[11px] text-ink-muted text-center leading-snug">Speak your answers</span>
          </button>
        </div>
        </div>
      </div>

      {/* Pinned footer — always visible inside the card */}
      <div className="shrink-0 border-t border-line-hairline bg-surface-card px-6 py-4 flex justify-center">
        <Button
          type="button"
          onClick={onStart}
          disabled={loading}
          variant="default"
          size="lg"
          className="w-full max-w-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon className="w-4 h-4" />
              Starting session...
            </span>
          ) : (
            `Start ${mode === 'voice' ? 'Voice' : 'Chat'} Session`
          )}
        </Button>
      </div>
    </div>
  );
}
