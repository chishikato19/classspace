import { readBarcodesFromImageData, type ReaderOptions, type ReadResult } from 'zxing-wasm/reader';

self.onmessage = async (e: MessageEvent<{ imageData: ImageData; options?: ReaderOptions }>) => {
  try {
    const { imageData, options } = e.data;
    const results = await readBarcodesFromImageData(imageData, options);
    self.postMessage({ results });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
