import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  const pageTexts = await Promise.all(
    pageNumbers.map(async (pageNum) => {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      return content.items.map((item) => item.str).join(' ');
    })
  );

  return pageTexts.join('\n\n').trim();
}
