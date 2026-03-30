import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Maximize2, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, PenTool, Sun, Circle, Minus, Type, RotateCcw, MousePointer2, Loader2, Download } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas, { ToolType } from '../../showcase/components/DrawingCanvas';

// Set worker URL for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
  accessToken: string;
}

export default function PdfViewer({ fileUrl, fileName, onClose, accessToken }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfData, setPdfData] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Drawing state
  const [activeTool, setActiveTool] = useState<ToolType | 'pointer'>('pointer');
  const [penColor, setPenColor] = useState('#ef4444');
  const [annotations, setAnnotations] = useState<Record<number, string>>({}); // pageNumber -> annotations string
  
  // Panning state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch PDF data with auth token
  useEffect(() => {
    const fetchPdf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        setPdfData(blob);
      } catch (err: any) {
        console.error('Error fetching PDF:', err);
        setError(err.message || 'Không thể tải file PDF.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPdf();
  }, [fileUrl, accessToken]);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Document load handler
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  // Navigation
  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
    // Reset pan when changing pages
    setPanOffset({ x: 0, y: 0 });
  };

  // Panning handlers
  const handlePanStart = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    if (scale > 1 && activeTool === 'pointer') {
      e.preventDefault();
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePanMove = (e: React.PointerEvent) => {
    if (isPanning) {
      e.preventDefault();
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePanEnd = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Reset pan when zooming out completely
  useEffect(() => {
    if (scale <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [scale]);

  const handleAddStroke = (newAnnotations: string) => {
    setAnnotations(prev => ({
      ...prev,
      [pageNumber]: newAnnotations
    }));
  };

  const clearAnnotations = () => {
    setAnnotations(prev => ({
      ...prev,
      [pageNumber]: '[]'
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col" ref={containerRef}>
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-gray-900 text-white border-b border-gray-800 shrink-0">
        <h3 className="font-medium truncate max-w-md px-2">{fileName}</h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Toàn màn hình"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-red-400 hover:text-red-300"
            title="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-800 flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-900 border-b border-gray-800 p-2 flex flex-wrap items-center justify-center gap-2 shrink-0 z-10">
          {/* Navigation */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              disabled={pageNumber <= 1}
              onClick={() => changePage(-1)}
              className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm font-medium min-w-[4rem] text-center">
              {pageNumber} / {numPages || '-'}
            </span>
            <button
              disabled={pageNumber >= numPages}
              onClick={() => changePage(1)}
              className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-700 mx-1 hidden sm:block" />

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <span className="text-white text-xs font-medium w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(3, s + 0.25))}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-700 mx-1 hidden md:block" />

          {/* Drawing Tools */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTool('pointer')}
              className={`p-2 rounded transition-colors ${activeTool === 'pointer' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              title="Con trỏ chuột (Di chuyển)"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('laser')}
              className={`p-2 rounded transition-colors ${activeTool === 'laser' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              title="Bút Laser"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-2 rounded transition-colors ${activeTool === 'pen' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              title="Bút vẽ"
            >
              <PenTool className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('circle')}
              className={`p-2 rounded transition-colors ${activeTool === 'circle' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              title="Khoanh tròn"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('line')}
              className={`p-2 rounded transition-colors ${activeTool === 'line' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              title="Gạch chân"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={`p-2 rounded transition-colors ${activeTool === 'text' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              title="Viết chữ"
            >
              <Type className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-gray-600 mx-1" />

            {/* Colors */}
            <div className="flex gap-1 px-1">
              {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#000000'].map(c => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${penColor === c ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="w-px h-4 bg-gray-600 mx-1" />

            <button
              onClick={clearAnnotations}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-red-400 hover:text-red-300"
              title="Xóa nét vẽ trang này"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Area */}
        <div 
          className="flex-1 overflow-hidden relative flex items-center justify-center touch-none"
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onPointerLeave={handlePanEnd}
        >
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 z-20">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-white">Đang tải tài liệu...</p>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 z-20 px-4 text-center">
              <div className="bg-red-900/50 text-red-200 p-6 rounded-xl max-w-md border border-red-800">
                <p className="font-medium mb-2">{error}</p>
                <button 
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {pdfData && (
            <div 
              className="relative transition-transform duration-200 ease-out"
              style={{ 
                transform: `scale(${scale}) translate(${panOffset.x / scale}px, ${panOffset.y / scale}px)`,
                cursor: scale > 1 && activeTool === 'pointer' ? (isPanning ? 'grabbing' : 'grab') : 'default'
              }}
            >
              <Document
                file={pdfData}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={null}
                className="shadow-2xl bg-white"
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={1} // We handle scale via CSS transform for better performance with drawing
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="relative"
                >
                  {/* Drawing Canvas Overlay */}
                  <div className="absolute inset-0 z-10">
                    <DrawingCanvas
                      annotations={annotations[pageNumber] || '[]'}
                      onAddStroke={handleAddStroke}
                      readOnly={activeTool === 'pointer'}
                      color={penColor}
                      tool={activeTool === 'pointer' ? 'pen' : activeTool}
                    />
                  </div>
                </Page>
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
