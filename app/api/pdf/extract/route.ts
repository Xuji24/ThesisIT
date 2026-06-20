import { type NextRequest, NextResponse } from 'next/server';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
export const runtime = 'nodejs';

const MAX_PAGES = 80;
const MAX_CHARS = 240_000;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `PDF too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 50 MB.` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    // pdfjs in Node.js uses a "fake worker" — it dynamically imports the worker
    // module in-process instead of spawning a thread. Turbopack can't resolve the
    // relative "./pdf.worker.mjs" path it falls back to, causing the 500 error.
    //
    // Fix: pre-import the worker module and register it on globalThis.pdfjsWorker.
    // PDFWorker._setupFakeWorkerGlobal checks globalThis.pdfjsWorker?.WorkerMessageHandler
    // FIRST (before attempting any dynamic import), so this skips workerSrc entirely.
    const [pdfjsLib] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs')
    ]);

    // Register the worker handler so pdfjs uses it in-process without needing workerSrc.
    (globalThis as Record<string, unknown>).pdfjsWorker = pdfjsWorker;

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
    }).promise;

    const numPages = Math.min(pdf.numPages, MAX_PAGES);
    const pageTexts: string[] = [];
    let totalChars = 0;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join(' ');
      page.cleanup();
      pageTexts.push(text);
      totalChars += text.length;
      if (totalChars >= MAX_CHARS) break;
    }

    pdf.destroy();

    const extractedText = pageTexts.join('\n\n').trim().slice(0, MAX_CHARS);
    if (extractedText.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract text. Use a text-based PDF, not a scanned image only.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: extractedText });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to extract PDF.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
