const MAX_PAGES = 100;

export async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const numPages = Math.min(pdf.numPages, MAX_PAGES);
  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);
  const pageTexts = await Promise.all(
    pageNumbers.map(async (pageNum) => {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      return content.items.map((item) => item.str).join(' ');
    })
  );

  return pageTexts.join('\n\n').trim();
}
