'use client';

import { useState } from 'react';
import UploadScreen from './components/UploadScreen';
import Dashboard from './components/Dashboard';
import { useLocalStorage, clearSessionData, STORAGE_KEYS } from './hooks/useLocalStorage';

export default function App() {
  const [thesisText, setThesisText] = useLocalStorage(STORAGE_KEYS.THESIS_TEXT, '');
  const [fileName, setFileName] = useLocalStorage(STORAGE_KEYS.FILE_NAME, '');
  const [activeTab, setActiveTab] = useLocalStorage(STORAGE_KEYS.ACTIVE_TAB, 'strengths');

  const handleUploadComplete = (text: string, name: string) => {
    // Clear previous session data before loading new thesis
    clearSessionData();
    setThesisText(text);
    setFileName(name);
    setActiveTab('strengths');
  };

  const handleReset = () => {
    clearSessionData();
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
    />
  );
}
