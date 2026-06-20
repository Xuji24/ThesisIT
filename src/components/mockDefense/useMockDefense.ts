'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { callLLMStream } from '@/lib/llm';
import { extractSections } from '@/lib/extractSections';
import { MOCK_DEFENSE_PROMPT, MOCK_DEFENSE_EVALUATION_PROMPT, injectPrompt, sanitizeForPrompt } from '@/lib/prompts';
import { useSpeechRecognition, useAudioRecorder } from '@/hooks/useSpeech';
import { useTTS } from '@/hooks/useTTS';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';
import { buildEvaluationTranscript, buildThesisContext, downloadSessionTranscript } from './utils';
import type { ChatMessage, SessionMode, SessionView } from './types';

export function useMockDefense(thesisText: string) {
  const [difficulty, setDifficulty] = useLocalStorage(STORAGE_KEYS.MOCK_DIFFICULTY, 'Standard');
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>(STORAGE_KEYS.MOCK_MESSAGES, []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useLocalStorage(STORAGE_KEYS.MOCK_STARTED, false);
  const [mode, setMode] = useLocalStorage<SessionMode>(STORAGE_KEYS.MOCK_MODE, 'chat');
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [questionLimit, setQuestionLimit] = useLocalStorage(STORAGE_KEYS.MOCK_QUESTION_LIMIT, 10);
  const [evalReport, setEvalReport] = useLocalStorage(STORAGE_KEYS.MOCK_EVAL_REPORT, '');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [view, setView] = useState<SessionView>('transcript');
  const [showTranscript, setShowTranscript] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [mounted, setMounted] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamTextRef = useRef('');
  const rafRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const speech = useSpeechRecognition();
  const synth = useTTS();
  const recorder = useAudioRecorder();
  const synthRef = useRef(synth);
  synthRef.current = synth;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      synthRef.current.cancel();
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (mode === 'chat') synth.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const thesisContext = useMemo(() => buildThesisContext(thesisText), [thesisText]);

  const systemPrompt = useMemo(
    () =>
      injectPrompt(MOCK_DEFENSE_PROMPT, {
        DIFFICULTY: difficulty,
        THESIS_TEXT: sanitizeForPrompt(thesisContext),
      }),
    [difficulty, thesisContext],
  );

  const panelQCount = messages.filter((m) => m.role === 'assistant').length;
  const isSessionComplete = questionLimit > 0 && panelQCount >= questionLimit && !loading;
  const hasRecording = !speech.isListening && !!(speech.transcriptRef.current || recorder.audioURL);
  const aiIsSpeaking = mode === 'voice' && synth.isSpeaking;

  const stopVoiceCapture = useCallback(() => {
    if (speech.isListening) speech.stopListening();
    recorder.stopRecording();
    recorder.clearAudio();
    speech.clearTranscript();
    audioRef.current?.pause();
    setIsPlayingBack(false);
  }, [speech, recorder]);

  const sendToClaude = useCallback(
    async (nextMessages: ChatMessage[]) => {
      synth.cancel();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      streamTextRef.current = '';
      let firstChunk = true;

      await callLLMStream({
        systemPrompt,
        messages: nextMessages,
        maxTokens: 1000,
        task: 'Mock Defense',
        signal: controller.signal,
        onChunk: (text: string) => {
          if (firstChunk) {
            setLoading(false);
            firstChunk = false;
          }
          streamTextRef.current = text;
          if (!rafRef.current) {
            rafRef.current = true;
            requestAnimationFrame(() => {
              rafRef.current = false;
              setMessages([...nextMessages, { role: 'assistant', content: streamTextRef.current }]);
            });
          }
        },
      });

      if (controller.signal.aborted) return;
      const finalText = streamTextRef.current;
      setMessages([...nextMessages, { role: 'assistant', content: finalText }]);
      setLoading(false);

      if (modeRef.current === 'voice' && finalText) {
        synth.speak(finalText);
      }
    },
    [systemPrompt, setMessages, synth],
  );

  const startSession = useCallback(async () => {
    setStarted(true);
    const first: ChatMessage[] = [{ role: 'user', content: 'Begin the oral defense.' }];
    setMessages(first);
    await sendToClaude(first);
  }, [setStarted, setMessages, sendToClaude]);

  const resetSession = useCallback(() => {
    synth.cancel();
    stopVoiceCapture();
    abortRef.current?.abort();
    setStarted(false);
    setMessages([]);
    setInput('');
    setLoading(false);
    setEvalReport('');
    setView('transcript');
  }, [synth, stopVoiceCapture, setStarted, setMessages, setEvalReport]);

  const sendReply = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages.slice(-20), { role: 'user', content: text }];
    setMessages(next);
    await sendToClaude(next);
  }, [input, loading, messages, setMessages, sendToClaude]);

  const toggleMic = useCallback(async () => {
    if (synth.isSpeaking) synth.cancel();
    if (speech.isListening) {
      speech.stopListening();
      recorder.stopRecording();
    } else {
      speech.clearTranscript();
      recorder.clearAudio();
      setIsPlayingBack(false);
      await recorder.startRecording();
      speech.startListening();
    }
  }, [synth, speech, recorder]);

  const handleRetry = useCallback(() => {
    speech.stopListening();
    recorder.cancelRecording();
    speech.clearTranscript();
    setIsPlayingBack(false);
    setTimeout(async () => {
      await recorder.startRecording();
      speech.startListening();
    }, 120);
  }, [speech, recorder]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlayingBack) {
      audio.pause();
      setIsPlayingBack(false);
    } else {
      audio.currentTime = 0;
      setIsPlayingBack(true);
      try {
        await audio.play();
      } catch {
        setIsPlayingBack(false);
      }
    }
  }, [isPlayingBack]);

  const saveSession = useCallback(() => {
    downloadSessionTranscript(messages, difficulty);
  }, [messages, difficulty]);

  const evaluateSession = useCallback(async () => {
    if (messages.length < 2) return;

    synth.cancel();
    stopVoiceCapture();

    setIsEvaluating(true);
    setEvalReport('');
    setView('evaluation');

    const transcript = buildEvaluationTranscript(messages);
    const evalPrompt = injectPrompt(MOCK_DEFENSE_EVALUATION_PROMPT, {
      DIFFICULTY: difficulty,
      THESIS_TEXT: sanitizeForPrompt(extractSections(thesisText, 2500)),
      TRANSCRIPT: sanitizeForPrompt(transcript),
    });

    let firstChunk = true;
    await callLLMStream({
      systemPrompt: evalPrompt,
      messages: [{ role: 'user', content: 'Evaluate my performance in this mock defense session.' }],
      maxTokens: 2000,
      task: 'Mock Defense — Evaluation',
      onChunk: (text) => {
        if (firstChunk) {
          setIsEvaluating(false);
          firstChunk = false;
        }
        setEvalReport(text);
      },
    });
    setIsEvaluating(false);
  }, [messages, synth, stopVoiceCapture, setEvalReport, difficulty, thesisText]);

  const sendVoiceReply = useCallback(async () => {
    const text = speech.transcriptRef.current.trim();
    if (!text || loading) return;
    synth.cancel();
    recorder.stopRecording();
    recorder.clearAudio();
    speech.clearTranscript();
    audioRef.current?.pause();
    setIsPlayingBack(false);
    const next = [...messages.slice(-20), { role: 'user', content: text }];
    setMessages(next);
    await sendToClaude(next);
  }, [speech, loading, synth, recorder, messages, setMessages, sendToClaude]);

  const replayLastQuestion = useCallback(() => {
    const lastAI = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAI) {
      synth.cancel();
      synth.speak(lastAI.content);
    }
  }, [messages, synth]);

  return {
    // Setup
    difficulty,
    setDifficulty,
    questionLimit,
    setQuestionLimit,
    mode,
    setMode,
    startSession,
    loading,

    // Session meta
    started,
    messages,
    input,
    setInput,
    view,
    setView,
    evalReport,
    isEvaluating,
    showTranscript,
    setShowTranscript,
    showCriteria,
    setShowCriteria,
    mounted,
    panelQCount,
    isSessionComplete,

    // Voice / speech
    speech,
    synth,
    recorder,
    audioRef,
    isPlayingBack,
    setIsPlayingBack,
    hasRecording,
    aiIsSpeaking,
    toggleMic,
    handleRetry,
    togglePlayback,
    sendVoiceReply,

    // Actions
    sendReply,
    resetSession,
    saveSession,
    evaluateSession,
    replayLastQuestion,

    // Refs
    endRef,
  };
}

export type MockDefenseSession = ReturnType<typeof useMockDefense>;
