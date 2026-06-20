'use client';

import { Suspense, Component, type ReactNode, useState } from 'react';
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
          <p className="text-sm text-neutral-500 mb-4">Something went wrong in this tab.</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="text-sm font-medium text-neutral-900 underline underline-offset-4"
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
    <div className="min-h-full bg-slate-50 text-slate-900 font-sans antialiased flex flex-col relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />

      <header className="sticky top-0 z-20 glass border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-lg font-heading font-bold text-emerald-900 tracking-tight shrink-0">ThesisIT</h1>
            <span className="text-slate-300 hidden sm:block">|</span>
            <p
              className="text-sm font-medium text-slate-500 truncate max-w-xs hidden sm:flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-full border border-slate-200/50"
              title={fileName}
            >
              <FileText className="w-4 h-4 shrink-0 text-emerald-500" strokeWidth={2} />
              <span className="truncate">{fileName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={onReset} className="border-slate-200 hover:bg-slate-100/50 transition-colors cursor:pointer">
              <Upload className="w-4 h-4 mr-1.5 text-slate-600" strokeWidth={2} />
              <span className="hidden sm:inline font-medium">New PDF</span>
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={onTabChange}
          className="max-w-7xl mx-auto px-6 lg:px-8"
        >
          <TabsList className="bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 mb-3">
            {TABS.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm hover:bg-white/60 hover:text-emerald-600 transition-all duration-200 cursor-pointer"
              >
                <TabIcon id={tab.id} className="w-4 h-4 mr-2 opacity-80" />
                <span className="font-medium">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <main className="flex-1 flex flex-col min-h-0 z-10 max-w-7xl mx-auto w-full p-6 lg:p-8 group">
        <div className="flex-1 flex flex-col glass-card bg-white/60 overflow-hidden shadow-xl shadow-slate-200/40 border-slate-200/60 rounded-3xl tab-enter hover:shadow-2xl hover:shadow-emerald-200/40 hover:border-emerald-100 transition-all duration-500">
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
