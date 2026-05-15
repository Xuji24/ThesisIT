import { useState } from 'react';
import UploadScreen from './components/UploadScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import { useInitialProvider } from './components/ProviderSelector.jsx';

export default function App() {
  const [thesisText, setThesisText] = useState('');
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState('strengths');
  const [llmProvider, setLlmProvider] = useInitialProvider();

  const handleUploadComplete = (text, name) => {
    setThesisText(text);
    setFileName(name);
    setActiveTab('strengths');
  };

  const handleReset = () => {
    setThesisText('');
    setFileName('');
    setActiveTab('strengths');
  };

  if (!thesisText) {
    return <UploadScreen onUploadComplete={handleUploadComplete} />;
  }

  return (
    <Dashboard
      thesisText={thesisText}
      fileName={fileName}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onReset={handleReset}
      llmProvider={llmProvider}
      onLlmProviderChange={setLlmProvider}
    />
  );
}
