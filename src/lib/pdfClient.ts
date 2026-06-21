import * as pdfjsLib from 'pdfjs-dist';

const MAX_PAGES = 120;
const MAX_CHARS = 400_000;

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

export interface PdfExtractionProgress {
  currentPage: number;
  totalPages: number;
}

export async function extractPdfText(
  file: File,
  onProgress?: (progress: PdfExtractionProgress) => void,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  try {
    const totalPages = Math.min(pdf.numPages, MAX_PAGES);
    const pageTexts: string[] = [];
    let totalChars = 0;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      onProgress?.({ currentPage: pageNumber, totalPages });

      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');

      page.cleanup();
      pageTexts.push(text);
      totalChars += text.length;

      if (totalChars >= MAX_CHARS) break;
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    const extractedText = pageTexts.join('\n\n').trim().slice(0, MAX_CHARS);
    if (extractedText.length < 50) {
      throw new Error('Could not extract text. Use a text-based PDF, not a scanned image only.');
    }

    return extractedText;
  } finally {
    await pdf.destroy();
  }
}
