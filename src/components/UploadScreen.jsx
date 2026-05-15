import { useCallback, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { extractPdfText } from '../lib/extractPdf.js';

export default function UploadScreen({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file only.');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }, []);

  const openFilePicker = () => inputRef.current?.click();

  const handleUpload = async () => {
    if (!file) {
      openFilePicker();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const text = await extractPdfText(file);
      if (!text || text.length < 50) {
        throw new Error('Could not extract enough text. Try a text-based PDF (not scanned images only).');
      }
      onUploadComplete(text, file.name);
    } catch (err) {
      setError(err.message || 'Failed to read PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-white text-neutral-900 antialiased flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-neutral-100 px-6 py-4">
        <span className="text-base font-semibold tracking-tight">ThesisIT</span>
      </header>

      {/* Centered main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">ThesisIT</h1>
            <p className="mt-3 text-base text-neutral-500">
              Your AI-powered thesis defense coach
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={!file && !loading ? openFilePicker : undefined}
            className={`rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-colors ${
              !file && !loading ? 'cursor-pointer' : ''
            } ${
              dragOver
                ? 'border-neutral-900 bg-neutral-50'
                : 'border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <FileUp className="w-7 h-7 text-neutral-300" strokeWidth={1.5} />
                <div className="w-44 h-0.5 bg-neutral-100 rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 w-1/3 bg-neutral-400 rounded-full progress-bar" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm text-neutral-600 font-medium">Reading your manuscript</p>
                  <p className="text-xs text-neutral-400 truncate max-w-50">{file?.name}</p>
                </div>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <FileUp className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />
                <p className="text-sm font-medium text-neutral-900 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-neutral-400">Ready to process</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-400">
                <FileUp className="w-8 h-8" strokeWidth={1.5} />
                <p className="text-sm">
                  <span className="font-medium text-neutral-700">Drop your PDF here</span>
                  {' '}or{' '}
                  <span className="font-medium text-neutral-700">click to browse</span>
                </p>
                <p className="text-xs">PDF files only</p>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            className="mt-5 w-full py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? 'Reading manuscript...'
              : file
              ? 'Continue with thesis'
              : 'Upload PDF'}
          </button>
        </div>
      </main>
    </div>
  );
}
