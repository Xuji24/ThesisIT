const MAX_PAGES = 80;
/** Hard cap on extracted text (~40 000 words). Prevents OOM from dense PDFs. */
const MAX_CHARS = 240_000;
/** Reject PDFs above this size before pdfjs ever touches them. */
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function extractPdfText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `PDF is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
        'Please upload a PDF under 50 MB.'
    );
  }

  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const numPages = Math.min(pdf.numPages, MAX_PAGES);
  const pageTexts: string[] = [];
  let totalChars = 0;

  // Sequential loop — only one pdfjs page object in memory at a time.
  // Promise.all would hold all pages simultaneously: 5–50 MB × 100 = 500 MB–5 GB peak.
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    page.cleanup(); // release font/glyph/annotation resources immediately
    pageTexts.push(text);
    totalChars += text.length;
    if (totalChars >= MAX_CHARS) break; // stop early — we have enough text
  }

  pdf.destroy(); // free the document-level pdfjs memory

  return pageTexts.join('\n\n').trim().slice(0, MAX_CHARS);
}
