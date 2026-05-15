import { useCallback, useRef, useState } from 'react';
import { extractPdfText } from '../lib/extractPdf.js';
import { FileIcon, SpinnerIcon } from './icons.jsx';

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
    const f = e.dataTransfer.files?.[0];
    pickFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError('Select a PDF to continue.');
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
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <header className="text-center mb-10 max-w-xl">
        <h1 className="font-display text-5xl md:text-6xl font-bold text-gold-400 tracking-tight">
          ThesisAI
        </h1>
        <p className="mt-3 text-lg text-slate-300">
          Your AI-powered thesis defense coach
        </p>
      </header>

      <div
        className={`w-full max-w-lg rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? 'border-gold-500 bg-gold-500/10'
            : 'border-navy-700 bg-navy-800/50 hover:border-gold-600/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex justify-center mb-3">
          <FileIcon className="w-12 h-12 text-gold-500/70" />
        </div>
        <p className="text-slate-200 font-medium">Drag & drop your thesis PDF</p>
        <p className="text-slate-400 text-sm mt-1">or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 text-gold-400 hover:text-gold-300 underline underline-offset-4 text-sm font-medium"
        >
          browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {file && (
          <p className="mt-4 text-sm text-gold-500/90 truncate px-2">{file.name}</p>
        )}
      </div>

      {error && (
        <p className="mt-4 text-red-400 text-sm max-w-lg text-center">{error}</p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || loading}
        className="mt-8 px-8 py-3 rounded-xl bg-gold-500 text-navy-950 font-semibold hover:bg-gold-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon className="w-5 h-5" /> Reading your manuscript...
          </span>
        ) : (
          'Upload & Analyze'
        )}
      </button>
    </div>
  );
}

