import { FileText, Upload } from 'lucide-react';
import MockDefense from './MockDefense.jsx';
import StrengthsWeaknesses from './StrengthsWeaknesses.jsx';
import ChatWithDoc from './ChatWithDoc.jsx';
import PanelRecos from './PanelRecos.jsx';
import ProviderSelector from './ProviderSelector.jsx';
import { TabIcon } from './icons.jsx';
import { btnOutline, headerBar, shell, tabActive, tabInactive } from '../lib/ui.js';

const TABS = [
  { id: 'mock', label: 'Mock Defense' },
  { id: 'strengths', label: 'Strengths & Weaknesses' },
  { id: 'chat', label: 'Chat with Thesis' },
  { id: 'panel', label: 'Panelist Recommendations' },
];

export default function Dashboard({
  thesisText,
  fileName,
  activeTab,
  onTabChange,
  onReset,
  llmProvider,
  onLlmProviderChange,
}) {
  return (
    <div className={`${shell} flex flex-col`}>
      <header className={headerBar}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-semibold text-neutral-900 tracking-tight shrink-0">ThesisIT</h1>
            <span className="text-neutral-200 hidden sm:block">|</span>
            <p
              className="text-xs text-neutral-400 truncate max-w-xs hidden sm:flex items-center gap-1.5"
              title={fileName}
            >
              <FileText className="w-3 h-3 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{fileName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <ProviderSelector provider={llmProvider} onChange={onLlmProviderChange} />
            <button type="button" onClick={onReset} className={btnOutline}>
              <Upload className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">New PDF</span>
            </button>
          </div>
        </div>

        <nav className="max-w-6xl mx-auto px-6 lg:px-8 flex overflow-x-auto border-t border-neutral-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`shrink-0 px-4 py-3 text-sm transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.id ? tabActive : tabInactive
              }`}
            >
              <TabIcon id={tab.id} className="w-4 h-4" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 flex flex-col min-h-0 tab-enter max-w-6xl mx-auto w-full">
        {activeTab === 'mock' && (
          <MockDefense thesisText={thesisText} llmProvider={llmProvider} />
        )}
        {activeTab === 'strengths' && (
          <StrengthsWeaknesses thesisText={thesisText} llmProvider={llmProvider} />
        )}
        {activeTab === 'chat' && (
          <ChatWithDoc thesisText={thesisText} llmProvider={llmProvider} />
        )}
        {activeTab === 'panel' && (
          <PanelRecos thesisText={thesisText} llmProvider={llmProvider} />
        )}
      </main>
    </div>
  );
}
