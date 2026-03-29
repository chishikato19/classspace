import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Maximize2, X, Trash2, Columns, LayoutGrid, PenTool, RotateCcw } from 'lucide-react';
import { authService } from '../../auth/services/authService';
import { showcaseService, ShowcaseImage } from '../services/showcaseService';
import ImageCropper from '../components/ImageCropper';
import DrawingCanvas from '../components/DrawingCanvas';

export default function ShowcaseDashboard() {
  const [images, setImages] = useState<ShowcaseImage[]>([]);
  const [viewMode, setViewMode] = useState<'projector' | 'camera'>('projector');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Cropper state
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string | null>(null);
  
  // Drawing state (for camera mode remote control)
  const [activeDrawingImage, setActiveDrawingImage] = useState<ShowcaseImage | null>(null);
  const [penColor, setPenColor] = useState('#ef4444');

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) return;

    const unsubscribe = showcaseService.subscribeToImages(user.uid, (fetchedImages) => {
      setImages(fetchedImages);
    });

    return () => unsubscribe();
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions (Full HD)
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;

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
          
          // Compress to JPEG with 80% quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
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
      const user = authService.getCurrentUser();
      if (user) {
        await showcaseService.addImage(user.uid, croppedImageBase64, 'gallery');
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
            <p className="mt-4 text-gray-500">Ảnh sẽ được tự động nén và gửi lên máy chiếu.</p>
          </div>

          {/* Quick Gallery for Camera Mode */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Ảnh vừa chụp ({images.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map(img => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                  <img src={img.imageUrl} alt="Student work" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button
                      onClick={() => setStatus(img.id, img.status === 'projecting' ? 'gallery' : 'projecting')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        img.status === 'projecting' ? 'bg-green-500 text-white' : 'bg-white text-gray-900'
                      }`}
                    >
                      {img.status === 'projecting' ? 'Đang chiếu' : 'Chiếu ngay'}
                    </button>
                    <button
                      onClick={() => setStatus(img.id, img.status === 'comparing' ? 'gallery' : 'comparing')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        img.status === 'comparing' ? 'bg-blue-500 text-white' : 'bg-white text-gray-900'
                      }`}
                    >
                      {img.status === 'comparing' ? 'Đang so sánh' : 'So sánh'}
                    </button>
                    {(img.status === 'projecting' || img.status === 'comparing') && (
                      <button
                        onClick={() => setActiveDrawingImage(img)}
                        className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500 text-white flex items-center gap-1"
                      >
                        <PenTool className="w-4 h-4" /> Vẽ
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                // We need the canvas to exactly match the image dimensions to align strokes.
                // For simplicity, we make the canvas cover the whole area and rely on relative coordinates.
                width: '100%', height: '100%' 
              }}>
                <DrawingCanvas
                  annotations={images.find(i => i.id === activeDrawingImage.id)?.annotations || '[]'}
                  onAddStroke={(newAnnotations) => showcaseService.updateAnnotations(activeDrawingImage.id, newAnnotations)}
                  color={penColor}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'projector' && (
        <div className="space-y-6">
          {/* Main Projection Area */}
          <div className="bg-black rounded-xl shadow-lg overflow-hidden min-h-[500px] flex items-center justify-center relative">
            {projectingImages.length > 0 ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img 
                  src={projectingImages[0].imageUrl} 
                  alt="Projected work" 
                  className="max-w-full max-h-[70vh] object-contain rounded shadow-2xl"
                />
                <button 
                  onClick={() => setStatus(projectingImages[0].id, 'gallery')}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ) : comparingImages.length > 0 ? (
              <div className="w-full h-full p-4">
                <div className={`grid gap-4 h-full ${comparingImages.length === 1 ? 'grid-cols-1' : comparingImages.length === 2 ? 'grid-cols-2' : comparingImages.length <= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3'}`}>
                  {comparingImages.map(img => (
                    <div key={img.id} className="relative flex items-center justify-center bg-gray-900 rounded-lg p-2">
                      <img 
                        src={img.imageUrl} 
                        alt="Compared work" 
                        className="max-w-full max-h-[65vh] object-contain rounded shadow-lg"
                      />
                      <button 
                        onClick={() => setStatus(img.id, 'gallery')}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Chưa có ảnh nào đang được trình chiếu.</p>
                <p className="text-sm">Chọn ảnh từ khay bên dưới hoặc dùng điện thoại để chụp.</p>
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
                  <div key={img.id} className="flex-none w-48 relative group rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100 snap-start">
                    <img src={img.imageUrl} alt="Student work thumbnail" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <button
                        onClick={() => {
                          // If projecting, replace the current projected image
                          projectingImages.forEach(pImg => setStatus(pImg.id, 'gallery'));
                          setStatus(img.id, 'projecting');
                        }}
                        className="w-full py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 flex items-center justify-center gap-1"
                      >
                        <Maximize2 className="w-4 h-4" /> Chiếu
                      </button>
                      <button
                        onClick={() => setStatus(img.id, 'comparing')}
                        className="w-full py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Columns className="w-4 h-4" /> So sánh
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
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
