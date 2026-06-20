'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadScreenProps {
  onUploadComplete: (text: string, name: string) => void;
}

export default function UploadScreen({ onUploadComplete }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file only.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('PDF is too large (over 50 MB). Please upload a smaller file.');
      return;
    }
    setError('');
    setFile(f);
  };

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
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
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/pdf/extract', { method: 'POST', body: fd });
      const data = await res.json() as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        throw new Error(data.error ?? 'Failed to read PDF.');
      }
      onUploadComplete(data.text, file.name);
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to read PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 font-sans antialiased flex flex-col relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-200/50 blur-3xl pointer-events-none" />

      {/* Minimal header */}
      <header className="glass px-6 py-4 z-10 sticky top-0">
        <span className="text-base font-heading font-bold tracking-tight text-emerald-900">ThesisIT</span>
      </header>

      {/* Centered main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 z-10">
        <div className="w-full max-w-xl tab-enter glass-card p-8 md:p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-heading font-bold tracking-tight text-slate-900">ThesisIT</h1>
            <p className="mt-3 text-base text-slate-500">
              Your AI-powered thesis defense coach
            </p>
          </div>

          <input
            ref={inputRef}
            placeholder={'Select your thesis PDF...'}
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
            className={`rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-all duration-300 ${
              !file && !loading ? 'cursor-pointer hover:shadow-lg hover:shadow-emerald-100' : ''
            } ${
              dragOver
                ? 'border-emerald-400 bg-emerald-50/50 scale-[1.02]'
                : 'border-slate-300 hover:border-emerald-400 bg-white/50'
            }`}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <FileUp className="w-8 h-8 text-emerald-400 animate-pulse" strokeWidth={1.5} />
                <div className="w-44 h-1.5 bg-slate-200 rounded-full overflow-hidden relative shadow-inner">
                  <div className="absolute inset-y-0 w-1/3 bg-emerald-500 rounded-full progress-bar shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm text-slate-700 font-medium">Reading your manuscript...</p>
                  <p className="text-xs text-slate-400 truncate max-w-[200px]">{file?.name}</p>
                </div>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                  <FileUp className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-slate-900 truncate max-w-[220px]">{file.name}</p>
                <p className="text-xs text-slate-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">Ready to process</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-1 group-hover:bg-emerald-50 transition-colors">
                  <FileUp className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" strokeWidth={1.5} />
                </div>
                <p className="text-sm">
                  <span className="font-medium text-slate-700">Drop your PDF here</span>
                  {' '}or{' '}
                  <span className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline">click to browse</span>
                </p>
                <p className="text-xs">PDF files only (max 50MB)</p>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mt-5 bg-red-50 border-red-200 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            variant="default"
            className="mt-6 w-full py-6 rounded-xl text-base font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading
              ? 'Reading manuscript...'
              : file
              ? 'Continue with thesis'
              : 'Upload PDF'}
          </Button>
        </div>
      </main>
    </div>
  );
}
