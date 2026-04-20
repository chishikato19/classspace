import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite specific import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const convertPdfToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    // Increase scale to 3.0 to ensure text remains crisp when zooming in
    const viewport = page.getViewport({ scale: 3.0 }); 

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await (page as any).render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    // Use PNG for lossless text clarity, or high-quality JPEG
    images.push(canvas.toDataURL('image/png')); 
  }

  return images;
};
