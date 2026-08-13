'use client';

import { Suspense, Component, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { FileText, Upload } from 'lucide-react';
import { TabIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


const MockDefense = dynamic(() => import('@/components/MockDefense'), { ssr: false });
const StrengthsWeaknesses = dynamic(() => import('@/components/StrengthsWeaknesses'), { ssr: false });
const ChatWithDoc = dynamic(() => import('@/components/ChatWithDoc'), { ssr: false });
const PanelRecos = dynamic(() => import('@/components/PanelRecos'), { ssr: false });

interface ErrorBoundaryState { error: Error | null; }
interface ErrorBoundaryProps { children: ReactNode; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm text-ink-muted mb-4">Something went wrong in this tab.</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="text-sm font-medium text-ink-primary underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TabFallback = () => (
  <div className="flex-1 overflow-y-auto p-6 lg:px-8 md:py-10 w-full">
    <div className="max-w-3xl w-full mx-auto space-y-10">
      <div className="flex flex-col items-center gap-3 pt-6">
        <div className="skeleton h-7 rounded-lg w-56" />
        <div className="skeleton h-4 rounded w-80" />
        <div className="skeleton h-4 rounded w-64" />
      </div>
      {[{ hw: '40%', lines: ['100%', '92%', '80%', '68%'] }, { hw: '52%', lines: ['100%', '95%', '88%', '75%', '60%'] }, { hw: '36%', lines: ['100%', '88%', '72%'] }].map((section, i) => (
        <div key={i} className="space-y-3">
          <div className="skeleton h-5 rounded-md" style={{ width: section.hw }} />
          <div className="space-y-2">
            {section.lines.map((w, j) => (
              <div key={j} className="skeleton h-3.5 rounded" style={{ width: w }} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-center pt-2">
        <div className="skeleton h-11 w-44 rounded-xl" />
      </div>
    </div>
  </div>
);

const TABS = [
  { id: 'mock', label: 'Mock Defense' },
  { id: 'strengths', label: 'Strengths & Weaknesses' },
  { id: 'chat', label: 'Chat with Thesis' },
  { id: 'panel', label: 'Panelist Recommendations' },
];

interface DashboardProps {
  thesisText: string;
  fileName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onReset: () => void;
}

export default function Dashboard({
  thesisText,
  fileName,
  activeTab,
  onTabChange,
  onReset,
}: DashboardProps) {
  return (
    <div className="min-h-full bg-surface-page text-ink-primary font-sans antialiased flex flex-col">
      {/* Sub-header: file context + reset. Global branding/nav lives in AppShell. */}
      <div className="sticky top-14 z-10 border-b border-line-hairline bg-surface-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <p
            className="text-sm font-medium text-ink-secondary truncate max-w-xs flex items-center gap-2 bg-surface-sunken px-3 py-1.5 rounded-full border border-line-hairline"
            title={fileName}
          >
            <FileText className="w-4 h-4 shrink-0 text-accent" strokeWidth={2} />
            <span className="truncate">{fileName}</span>
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            <Upload className="w-4 h-4 mr-1.5" strokeWidth={2} />
            <span className="hidden sm:inline font-medium">New PDF</span>
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={onTabChange}
          className="max-w-7xl mx-auto px-6 lg:px-8"
        >
          <TabsList className="bg-surface-sunken p-1 rounded-md border border-line-hairline mb-3">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-[calc(var(--radius-md)-2px)] data-[state=active]:bg-surface-card data-[state=active]:text-accent data-[state=active]:shadow-sm hover:text-ink-primary transition-colors cursor-pointer"
              >
                <TabIcon id={tab.id} className="w-4 h-4 mr-2 opacity-80" />
                <span className="font-medium">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <main className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full p-6 lg:p-8">
        <div className="flex-1 flex flex-col bg-surface-card border border-line-hairline overflow-hidden rounded-lg tab-enter">
          <ErrorBoundary key={activeTab}>
            <Suspense fallback={<TabFallback />}>
              {activeTab === 'mock' && (
                <MockDefense thesisText={thesisText} />
              )}
              {activeTab === 'strengths' && (
                <StrengthsWeaknesses thesisText={thesisText} />
              )}
              {activeTab === 'chat' && (
                <ChatWithDoc thesisText={thesisText} />
              )}
              {activeTab === 'panel' && (
                <PanelRecos thesisText={thesisText} />
              )}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
