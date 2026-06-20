export type SessionMode = 'chat' | 'voice';
export type SessionView = 'transcript' | 'evaluation';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface MockDefenseProps {
  thesisText: string;
}
