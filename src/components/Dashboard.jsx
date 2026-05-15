import MockDefense from './MockDefense.jsx';
import StrengthsWeaknesses from './StrengthsWeaknesses.jsx';
import ChatWithDoc from './ChatWithDoc.jsx';
import PanelRecos from './PanelRecos.jsx';
import ProviderSelector from './ProviderSelector.jsx';
import { TabIcon, FileIcon } from './icons.jsx';

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
    <div className="min-h-full flex flex-col bg-navy-950">
      <header className="border-b border-navy-700 bg-navy-900/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-gold-400">ThesisAI</h1>
          <p className="text-xs text-slate-400 truncate max-w-md flex items-center gap-1.5" title={fileName}>
            <FileIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">{fileName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ProviderSelector provider={llmProvider} onChange={onLlmProviderChange} />
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-gold-400 border border-navy-700 rounded-lg px-3 py-1.5"
          >
            Upload new PDF
          </button>
        </div>
      </header>

      <nav className="flex overflow-x-auto border-b border-navy-700 bg-navy-900/50 scrollbar-thin">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-gold-500 text-gold-400 bg-navy-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TabIcon id={tab.id} className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 flex flex-col min-h-0 tab-enter">
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
