export type SessionMode = 'chat' | 'voice';
export type SessionView = 'transcript' | 'evaluation';

export interface ChatMessage {
  role: string;
  content: string;
  /** Hardcoded vague-answer pushback — excluded from panel question count. */
  localOnly?: boolean;
}

export interface MockDefenseProps {
  thesisText: string;
}
