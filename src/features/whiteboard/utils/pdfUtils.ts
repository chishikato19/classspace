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
    // Reduce scale to 1.5 to prevent canvas memory limits/crashes on mobile devices
    const viewport = page.getViewport({ scale: 1.5 }); 

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

    images.push(canvas.toDataURL('image/jpeg', 0.8)); // Use JPEG with compression to save memory
  }

  return images;
};
