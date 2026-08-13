'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { extractPdfText, type PdfExtractionProgress } from '@/lib/pdfClient';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

interface UploadScreenProps {
  onUploadComplete: (text: string, name: string) => void;
}

export default function UploadScreen({ onUploadComplete }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<PdfExtractionProgress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastProgressRef = useRef<PdfExtractionProgress | null>(null);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file only.');
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`PDF is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Please upload a PDF under ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setError('');
    setProgress(null);
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
    setProgress(null);
    try {
      const text = await extractPdfText(file, (p) => {
        lastProgressRef.current = p;
        setProgress(p);
      });
      onUploadComplete(text, file.name);
      // Best-effort usage telemetry -- signed-in users only (see logEvent.ts),
      // never blocks or affects the upload flow either way.
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pdf_upload',
          meta: { pages: lastProgressRef.current?.totalPages ?? null, chars: text.length },
        }),
      }).catch(() => {});
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to read PDF.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl tab-enter rounded-lg border border-line-hairline bg-surface-card p-8 md:p-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-ink-primary">ThesisIT</h1>
          <p className="mt-3 text-base text-ink-muted">
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
          className={`rounded-md border-2 border-dashed px-8 py-14 text-center transition-colors duration-200 ${
            !file && !loading ? 'cursor-pointer' : ''
          } ${
            dragOver
              ? 'border-accent bg-accent-soft'
              : 'border-line-strong hover:border-accent bg-surface-sunken'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <FileUp className="w-8 h-8 text-accent animate-pulse" strokeWidth={1.5} />
              <div className="w-44 h-1.5 bg-line-hairline rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 w-1/3 bg-accent rounded-full progress-bar" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm text-ink-secondary font-medium">
                  {progress
                    ? `Reading page ${progress.currentPage} of ${progress.totalPages}...`
                    : 'Reading your manuscript...'}
                </p>
                <p className="text-xs text-ink-muted truncate max-w-[200px]">{file?.name}</p>
              </div>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mb-1">
                <FileUp className="w-8 h-8 text-accent" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-ink-primary truncate max-w-[220px]">{file.name}</p>
              <p className="text-xs text-ink-muted font-medium bg-surface-card px-3 py-1 rounded-full border border-line-hairline">Ready to process</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-ink-muted">
              <div className="w-16 h-16 rounded-full bg-surface-page flex items-center justify-center mb-1">
                <FileUp className="w-8 h-8 text-ink-muted" strokeWidth={1.5} />
              </div>
              <p className="text-sm">
                <span className="font-medium text-ink-secondary">Drop your PDF here</span>
                {' '}or{' '}
                <span className="font-medium text-accent hover:text-accent-hover hover:underline">click to browse</span>
              </p>
              <p className="text-xs">PDF files only (max {MAX_UPLOAD_MB}MB)</p>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mt-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          onClick={handleUpload}
          disabled={loading}
          variant="default"
          size="lg"
          className="mt-6 w-full"
        >
          {loading
            ? 'Reading manuscript...'
            : file
            ? 'Continue with thesis'
            : 'Upload PDF'}
        </Button>
      </div>
    </main>
  );
}
