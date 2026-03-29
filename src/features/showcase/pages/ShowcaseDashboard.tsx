import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Maximize2, X, Trash2, Columns, LayoutGrid, PenTool, RotateCcw, MousePointer2, Circle, Minus, Type, Sun, ZoomIn, ZoomOut } from 'lucide-react';
import { authService } from '../../auth/services/authService';
import { showcaseService, ShowcaseImage } from '../services/showcaseService';
import ImageCropper from '../components/ImageCropper';
import DrawingCanvas, { ToolType } from '../components/DrawingCanvas';

export default function ShowcaseDashboard() {
  const [images, setImages] = useState<ShowcaseImage[]>([]);
  const [viewMode, setViewMode] = useState<'projector' | 'camera'>('projector');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shouldCompress, setShouldCompress] = useState(true);
  
  // Cropper state
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string | null>(null);
  
  // Drawing state (for camera mode remote control)
  const [activeDrawingImage, setActiveDrawingImage] = useState<ShowcaseImage | null>(null);
  const [penColor, setPenColor] = useState('#ef4444');
  const [activeTool, setActiveTool] = useState<ToolType>('pen');

  // Projector state
  const projectorRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [projectorTool, setProjectorTool] = useState<ToolType | 'pointer'>('pointer');
  const [projectorColor, setProjectorColor] = useState('#ef4444');
  const [projectorZoom, setProjectorZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (projectorZoom <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [projectorZoom]);

  const handlePanStart = (e: React.PointerEvent) => {
    // Don't pan if clicking on a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    if (projectorZoom > 1 && projectorTool === 'pointer') {
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      projectorRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) return;

    const unsubscribe = showcaseService.subscribeToImages(user.uid, (fetchedImages) => {
      setImages(fetchedImages);
    });

    return () => unsubscribe();
  }, []);

  const compressImageBase64 = (base64Str: string, compress: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimensions
        const MAX_WIDTH = compress ? 1920 : 4000;
        const MAX_HEIGHT = compress ? 1080 : 4000;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', compress ? 0.8 : 0.95);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImageForCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading image:', error);
      alert('Có lỗi xảy ra khi đọc ảnh.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropComplete = async (croppedImageBase64: string) => {
    setSelectedImageForCrop(null);
    try {
      setIsUploading(true);
      const finalImage = await compressImageBase64(croppedImageBase64, shouldCompress);
      const user = authService.getCurrentUser();
      if (user) {
        await showcaseService.addImage(user.uid, finalImage, 'gallery');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropSkip = async () => {
    if (!selectedImageForCrop) return;
    const originalImage = selectedImageForCrop;
    setSelectedImageForCrop(null);
    try {
      setIsUploading(true);
      const finalImage = await compressImageBase64(originalImage, shouldCompress);
      const user = authService.getCurrentUser();
      if (user) {
        await showcaseService.addImage(user.uid, finalImage, 'gallery');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    setSelectedImageForCrop(null);
  };

  const setStatus = async (id: string, status: 'gallery' | 'projecting' | 'comparing') => {
    try {
      await showcaseService.updateImageStatus(id, status);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa ảnh này?')) {
      try {
        await showcaseService.deleteImage(id);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Bạn có chắc muốn xóa TẤT CẢ ảnh trong phiên này?')) {
      const user = authService.getCurrentUser();
      if (user) {
        await showcaseService.clearAllImages(user.uid);
      }
    }
  };

  // Derived state
  const projectingImages = images.filter(img => img.status === 'projecting');
  const comparingImages = images.filter(img => img.status === 'comparing');
  const galleryImages = images.filter(img => img.status === 'gallery');

  return (
    <div className="space-y-6">
      {selectedImageForCrop && (
        <ImageCropper
          imageSrc={selectedImageForCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          onSkip={handleCropSkip}
          quality={shouldCompress ? 0.8 : 0.95}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trình chiếu bài làm</h1>
          <p className="text-gray-500">Chụp và trình chiếu bài làm của học sinh lên màn hình lớn.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('camera')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              viewMode === 'camera' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">Chế độ chụp</span>
          </button>
          <button
            onClick={() => setViewMode('projector')}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              viewMode === 'projector' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Maximize2 className="w-5 h-5" />
            <span className="hidden sm:inline">Chế độ máy chiếu</span>
          </button>
        </div>
      </div>

      {viewMode === 'camera' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleCapture}
              className="hidden"
              id="camera-input"
            />
            <label
              htmlFor="camera-input"
              className={`inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 cursor-pointer ${
                isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6" />
                  Chụp ảnh bài làm
                </>
              )}
            </label>
            <div className="mt-6 flex items-center justify-center gap-2">
              <input 
                type="checkbox" 
                id="compress-toggle" 
                checked={shouldCompress} 
                onChange={(e) => setShouldCompress(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="compress-toggle" className="text-sm text-gray-700">
                Nén ảnh (tiết kiệm dung lượng, tải nhanh hơn)
              </label>
            </div>
            <p className="mt-4 text-gray-500">
              Sử dụng điện thoại để chụp ảnh bài làm, sau đó chuyển sang chế độ máy chiếu trên máy tính.
            </p>
          </div>

          {/* Quick Gallery for Camera Mode */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Ảnh vừa chụp ({images.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map(img => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex flex-col">
                  <div className="aspect-video relative">
                    <img src={img.imageUrl} alt="Student work" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2 bg-white border-t flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => setStatus(img.id, img.status === 'projecting' ? 'gallery' : 'projecting')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium flex-1 ${
                        img.status === 'projecting' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {img.status === 'projecting' ? 'Đang chiếu' : 'Chiếu ngay'}
                    </button>
                    <button
                      onClick={() => setStatus(img.id, img.status === 'comparing' ? 'gallery' : 'comparing')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium flex-1 ${
                        img.status === 'comparing' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {img.status === 'comparing' ? 'Đang so sánh' : 'So sánh'}
                    </button>
                    {(img.status === 'projecting' || img.status === 'comparing') && (
                      <button
                        onClick={() => setActiveDrawingImage(img)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500 text-white flex items-center justify-center gap-1 w-full mt-1"
                      >
                        <PenTool className="w-3.5 h-3.5" /> Chỉnh sửa / Vẽ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Drawing View for Mobile */}
      {activeDrawingImage && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
            <div className="flex gap-2">
              {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ffffff'].map(c => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${penColor === c ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTool('pen')}
                className={`p-2 rounded-lg ${activeTool === 'pen' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
              >
                <PenTool className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTool('laser')}
                className={`p-2 rounded-lg ${activeTool === 'laser' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
              >
                <Sun className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTool('circle')}
                className={`p-2 rounded-lg ${activeTool === 'circle' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
              >
                <Circle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTool('line')}
                className={`p-2 rounded-lg ${activeTool === 'line' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTool('text')}
                className={`p-2 rounded-lg ${activeTool === 'text' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
              >
                <Type className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => showcaseService.updateAnnotations(activeDrawingImage.id, '[]')}
                className="text-white hover:text-gray-300 flex items-center gap-1"
              >
                <RotateCcw className="w-5 h-5" /> Xóa nét
              </button>
              <button onClick={() => setActiveDrawingImage(null)} className="text-white hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <img 
              src={activeDrawingImage.imageUrl} 
              alt="Drawing target" 
              className="max-w-full max-h-full object-contain pointer-events-none"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ 
                width: '100%', height: '100%' 
              }}>
                <DrawingCanvas
                  annotations={images.find(i => i.id === activeDrawingImage.id)?.annotations || '[]'}
                  onAddStroke={(newAnnotations) => showcaseService.updateAnnotations(activeDrawingImage.id, newAnnotations)}
                  color={penColor}
                  tool={activeTool}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'projector' && (
        <div className="space-y-6">
          {/* Main Projection Area */}
          <div 
            ref={projectorRef}
            className={`group bg-black rounded-xl shadow-lg overflow-hidden flex items-center justify-center relative touch-none ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'min-h-[500px]'}`}
            onPointerDown={handlePanStart}
            onPointerMove={handlePanMove}
            onPointerUp={handlePanEnd}
            onPointerLeave={handlePanEnd}
          >
            {projectingImages.length > 0 ? (
              <div className="w-full h-full flex items-center justify-center p-4 relative group overflow-hidden">
                <div 
                  className="relative transition-transform duration-200 ease-out"
                  style={{ 
                    transform: `scale(${projectorZoom}) translate(${panOffset.x / projectorZoom}px, ${panOffset.y / projectorZoom}px)`,
                    cursor: projectorZoom > 1 && projectorTool === 'pointer' ? (isPanning ? 'grabbing' : 'grab') : 'default'
                  }}
                >
                  <img 
                    src={projectingImages[0].imageUrl} 
                    alt="Projected work" 
                    className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl pointer-events-none"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full h-full">
                      <DrawingCanvas
                        annotations={projectingImages[0].annotations || '[]'}
                        onAddStroke={(newAnnotations) => showcaseService.updateAnnotations(projectingImages[0].id, newAnnotations)}
                        readOnly={projectorTool === 'pointer'}
                        color={projectorColor}
                        tool={projectorTool === 'pointer' ? 'pen' : projectorTool}
                      />
                    </div>
                  </div>
                </div>
                {!isFullscreen && (
                  <button 
                    onClick={() => setStatus(projectingImages[0].id, 'gallery')}
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>
            ) : comparingImages.length > 0 ? (
              <div className="w-full h-full p-4 relative overflow-hidden">
                <div 
                  className="w-full h-full transition-transform duration-200 ease-out"
                  style={{ 
                    transform: `scale(${projectorZoom}) translate(${panOffset.x / projectorZoom}px, ${panOffset.y / projectorZoom}px)`,
                    cursor: projectorZoom > 1 && projectorTool === 'pointer' ? (isPanning ? 'grabbing' : 'grab') : 'default'
                  }}
                >
                  <div className={`grid gap-4 h-full ${comparingImages.length === 1 ? 'grid-cols-1' : comparingImages.length === 2 ? 'grid-cols-2' : comparingImages.length <= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3'}`}>
                    {comparingImages.map(img => (
                      <div key={img.id} className="relative flex items-center justify-center bg-gray-900 rounded-lg p-2 group">
                        <img 
                          src={img.imageUrl} 
                          alt="Compared work" 
                          className="max-w-full max-h-[85vh] object-contain rounded shadow-lg pointer-events-none"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative w-full h-full">
                            <DrawingCanvas
                              annotations={img.annotations || '[]'}
                              onAddStroke={(newAnnotations) => showcaseService.updateAnnotations(img.id, newAnnotations)}
                              readOnly={projectorTool === 'pointer'}
                              color={projectorColor}
                              tool={projectorTool === 'pointer' ? 'pen' : projectorTool}
                            />
                          </div>
                        </div>
                        {!isFullscreen && (
                          <button 
                            onClick={() => setStatus(img.id, 'gallery')}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Chưa có ảnh nào đang được trình chiếu.</p>
                <p className="text-sm">Chọn ảnh từ khay bên dưới hoặc dùng điện thoại để chụp.</p>
              </div>
            )}

            {/* Projector Toolbar (Visible on hover or when projecting) */}
            {(projectingImages.length > 0 || comparingImages.length > 0) && (
              <div 
                className="hide-scrollbar absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur text-white px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-full flex items-center gap-2 md:gap-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20 shadow-xl border border-gray-700 max-w-[95%] overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <style>{`
                  .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                  title="Toàn màn hình"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-700 mx-2" />
                <button
                  onClick={() => setProjectorTool('pointer')}
                  className={`p-2 rounded-full transition-colors ${projectorTool === 'pointer' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                  title="Con trỏ chuột"
                >
                  <MousePointer2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setProjectorTool('laser')}
                  className={`p-2 rounded-full transition-colors ${projectorTool === 'laser' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                  title="Bút Laser"
                >
                  <Sun className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setProjectorTool('pen')}
                  className={`p-2 rounded-full transition-colors ${projectorTool === 'pen' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                  title="Bút vẽ"
                >
                  <PenTool className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setProjectorTool('circle')}
                  className={`p-2 rounded-full transition-colors ${projectorTool === 'circle' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                  title="Khoanh tròn"
                >
                  <Circle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setProjectorTool('line')}
                  className={`p-2 rounded-full transition-colors ${projectorTool === 'line' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                  title="Gạch chân / Đường thẳng"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setProjectorTool('text')}
                  className={`p-2 rounded-full transition-colors ${projectorTool === 'text' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                  title="Viết chữ"
                >
                  <Type className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-700 mx-2" />
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setProjectorZoom(prev => Math.max(0.5, prev - 0.1))}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium w-8 text-center">{Math.round(projectorZoom * 100)}%</span>
                  <button
                    onClick={() => setProjectorZoom(prev => Math.min(3, prev + 0.1))}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-px h-6 bg-gray-700 mx-2" />
                <div className="flex gap-1">
                  {['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => setProjectorColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${projectorColor === c ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="w-px h-6 bg-gray-700 mx-2" />
                <button
                  onClick={() => {
                    projectingImages.forEach(img => showcaseService.updateAnnotations(img.id, '[]'));
                    comparingImages.forEach(img => showcaseService.updateAnnotations(img.id, '[]'));
                  }}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors text-red-400 hover:text-red-300"
                  title="Xóa tất cả nét vẽ"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Gallery Tray */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                Khay chờ ({galleryImages.length})
              </h3>
              {images.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa tất cả
                </button>
              )}
            </div>
            
            {galleryImages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Khay chờ trống.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {galleryImages.map(img => (
                  <div key={img.id} className="flex-none w-56 relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 snap-start flex flex-col">
                    <div className="aspect-video relative">
                      <img src={img.imageUrl} alt="Student work thumbnail" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-2 bg-white border-t flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          // If projecting, replace the current projected image
                          projectingImages.forEach(pImg => setStatus(pImg.id, 'gallery'));
                          setStatus(img.id, 'projecting');
                        }}
                        className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 flex items-center justify-center gap-1"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> Chiếu
                      </button>
                      <button
                        onClick={() => setStatus(img.id, 'comparing')}
                        className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Columns className="w-3.5 h-3.5" /> So sánh
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
