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
        <h2 className="text-2xl font-semibold text-neutral-900 mb-2">Mock Defense Session</h2>
        <p className="text-sm text-neutral-500 mb-10 max-w-sm mx-auto leading-relaxed">
          Simulate a live oral defense. The AI acts as a strict panelist — one question at a
          time, with critical follow-ups on weak answers.
        </p>

        <div className="w-full max-w-sm mb-6 mx-auto">
        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-3">
          Select Difficulty
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <Button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              variant={difficulty === d ? 'default' : 'outline'}
              className={`py-3 px-2 rounded-xl h-auto transition-all duration-200 hover:-translate-y-0.5 ${
                difficulty === d
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50'
              }`}
            >
              {d}
            </Button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-neutral-400">
          {DIFFICULTY_DESCRIPTIONS[difficulty as keyof typeof DIFFICULTY_DESCRIPTIONS]}
        </p>
      </div>

        <div className="w-full max-w-sm mb-6 mx-auto">
        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-3">
          Question Limit
        </p>
        <div className="grid grid-cols-5 gap-2">
          {LIMIT_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              onClick={() => setQuestionLimit(opt.value)}
              variant={questionLimit === opt.value ? 'default' : 'outline'}
              className={`py-2.5 px-1 rounded-xl h-auto text-xs transition-all duration-200 hover:-translate-y-0.5 ${
                questionLimit === opt.value
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50'
              }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          {questionLimit === 0
            ? 'No limit — runs until you end the session'
            : `Session ends automatically after ${questionLimit} panel questions`}
        </p>
      </div>

        <div className="w-full max-w-sm mb-4 mx-auto">
        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-3">
          Session Mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
              mode === 'chat'
                ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100'
                : 'border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
            }`}
          >
            <MessageSquare className={`w-6 h-6 ${mode === 'chat' ? 'text-emerald-600' : 'text-neutral-400'}`} strokeWidth={1.8} />
            <span className={`text-sm font-semibold ${mode === 'chat' ? 'text-emerald-700' : 'text-neutral-700'}`}>
              Chat
            </span>
            <span className="text-[11px] text-neutral-400 text-center leading-snug">Type your answers</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('voice')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
              mode === 'voice'
                ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100'
                : 'border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
            }`}
          >
            <Mic className={`w-6 h-6 ${mode === 'voice' ? 'text-emerald-600' : 'text-neutral-400'}`} strokeWidth={1.8} />
            <span className={`text-sm font-semibold ${mode === 'voice' ? 'text-emerald-700' : 'text-neutral-700'}`}>
              Voice
            </span>
            <span className="text-[11px] text-neutral-400 text-center leading-snug">Speak your answers</span>
          </button>
        </div>
        </div>
      </div>

      {/* Pinned footer — always visible inside the glass card */}
      <div className="shrink-0 border-t border-neutral-100 bg-white/90 backdrop-blur-sm px-6 py-4 flex justify-center">
        <Button
          type="button"
          onClick={onStart}
          disabled={loading}
          variant="default"
          className="w-full max-w-sm px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all duration-300 text-white font-semibold"
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
