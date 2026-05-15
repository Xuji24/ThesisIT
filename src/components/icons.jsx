import {
  Mic,
  BarChart3,
  MessageCircle,
  PenLine,
  FileText,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Loader2,
} from 'lucide-react';

const iconClass = 'shrink-0';

export const TAB_ICONS = {
  mock: Mic,
  strengths: BarChart3,
  chat: MessageCircle,
  panel: PenLine,
};

export const REPORT_SECTION_ICONS = {
  strengths: CheckCircle2,
  weaknesses: AlertTriangle,
  chapters: BookOpen,
  questions: HelpCircle,
  recommendations: Lightbulb,
};

/** Match ## headings from the strengths/weaknesses report to Lucide icons */
export function getReportSectionIcon(headingText) {
  const t = headingText.toLowerCase();
  if (t.includes('strength')) return REPORT_SECTION_ICONS.strengths;
  if (t.includes('weakness') || t.includes('loophole')) return REPORT_SECTION_ICONS.weaknesses;
  if (t.includes('chapter-by-chapter') || t.includes('chapter by chapter')) {
    return REPORT_SECTION_ICONS.chapters;
  }
  if (t.includes('predicted') || t.includes('panel question')) {
    return REPORT_SECTION_ICONS.questions;
  }
  if (t.includes('recommendation')) return REPORT_SECTION_ICONS.recommendations;
  return null;
}

export function TabIcon({ id, className = 'w-4 h-4' }) {
  const Icon = TAB_ICONS[id];
  if (!Icon) return null;
  return <Icon className={`${iconClass} ${className}`} aria-hidden />;
}

export function FileIcon({ className = 'w-10 h-10' }) {
  return <FileText className={`${iconClass} ${className} text-gold-500/80`} aria-hidden />;
}

export function SpinnerIcon({ className = 'w-5 h-5 animate-spin' }) {
  return <Loader2 className={`${iconClass} ${className}`} aria-hidden />;
}
