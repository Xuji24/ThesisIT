'use client';

import { ChatInput, ChatMessages } from './shared/ChatUI';
import MockDefenseSetup from './mockDefense/MockDefenseSetup';
import MockDefenseSessionHeader from './mockDefense/MockDefenseSessionHeader';
import MockDefenseVoiceView from './mockDefense/MockDefenseVoiceView';
import MockDefenseVoiceInput from './mockDefense/MockDefenseVoiceInput';
import MockDefenseEvaluationView from './mockDefense/MockDefenseEvaluationView';
import MockDefenseSessionBanner from './mockDefense/MockDefenseSessionBanner';
import MockDefenseCriteriaRail from './mockDefense/MockDefenseCriteriaRail';
import { useMockDefense } from './mockDefense/useMockDefense';
import type { MockDefenseProps } from './mockDefense/types';

export default function MockDefense({ thesisText }: MockDefenseProps) {
  const session = useMockDefense(thesisText);

  if (!session.started) {
    return (
      <div className="flex-1 min-h-0 flex flex-col w-full">
      <MockDefenseSetup
        difficulty={session.difficulty}
        setDifficulty={session.setDifficulty}
        questionLimit={session.questionLimit}
        setQuestionLimit={session.setQuestionLimit}
        mode={session.mode}
        setMode={session.setMode}
        loading={session.loading}
        onStart={session.startSession}
      />
      </div>
    );
  }

  const showVoiceOrb = session.view === 'transcript' && session.mode === 'voice' && !session.showTranscript;

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      <MockDefenseSessionHeader
        difficulty={session.difficulty}
        questionLimit={session.questionLimit}
        panelQCount={session.panelQCount}
        isSessionComplete={session.isSessionComplete}
        mode={session.mode}
        synth={session.synth}
        messages={session.messages}
        loading={session.loading}
        showTranscript={session.showTranscript}
        setShowTranscript={session.setShowTranscript}
        evalReport={session.evalReport}
        view={session.view}
        setView={session.setView}
        evaluateSession={session.evaluateSession}
        isEvaluating={session.isEvaluating}
        resetSession={session.resetSession}
        saveSession={session.saveSession}
        replayLastQuestion={session.replayLastQuestion}
      />

      <div className="flex-1 min-h-0 flex flex-col w-full">
        {session.view === 'transcript' ? (
          showVoiceOrb ? (
            <MockDefenseVoiceView
              loading={session.loading}
              aiIsSpeaking={session.aiIsSpeaking}
              speech={session.speech}
              hasRecording={session.hasRecording}
              synth={session.synth}
              recorder={session.recorder}
              toggleMic={session.toggleMic}
            />
          ) : (
            <ChatMessages
              messages={session.messages}
              endRef={session.endRef}
              assistantLabel="The Panel"
              loading={session.loading}
            />
          )
        ) : (
          <MockDefenseEvaluationView
            isEvaluating={session.isEvaluating}
            evalReport={session.evalReport}
            onReEvaluate={session.evaluateSession}
          />
        )}

        {session.isSessionComplete && session.view === 'transcript' && (
          <MockDefenseSessionBanner
            panelQCount={session.panelQCount}
            isEvaluating={session.isEvaluating}
            onEvaluate={session.evaluateSession}
          />
        )}

        {!session.isSessionComplete && session.view === 'transcript' && (
          <div className="shrink-0">
            {session.mode === 'chat' ? (
              <ChatInput
                value={session.input}
                onChange={session.setInput}
                onSubmit={session.sendReply}
                disabled={session.loading}
                placeholder="Type your answer..."
              />
            ) : (
              <MockDefenseVoiceInput
                speech={session.speech}
                synth={session.synth}
                recorder={session.recorder}
                audioRef={session.audioRef}
                isPlayingBack={session.isPlayingBack}
                setIsPlayingBack={session.setIsPlayingBack}
                hasRecording={session.hasRecording}
                aiIsSpeaking={session.aiIsSpeaking}
                loading={session.loading}
                toggleMic={session.toggleMic}
                handleRetry={session.handleRetry}
                togglePlayback={session.togglePlayback}
                sendVoiceReply={session.sendVoiceReply}
              />
            )}
          </div>
        )}
      </div>

      <MockDefenseCriteriaRail
        mounted={session.mounted}
        open={session.showCriteria}
        onToggle={() => session.setShowCriteria((v) => !v)}
        onClose={() => session.setShowCriteria(false)}
      />
    </div>
  );
}
