import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { Check, X, RotateCw, Send } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
  onSkip: () => void;
  quality?: number;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel, onSkip, quality = 0.8 }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, quality);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      alert('Có lỗi khi cắt ảnh.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-[100dvh] z-[60] bg-black flex flex-col">
      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
        />
      </div>
      <div className="bg-gray-900 p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 pb-safe overflow-y-auto max-h-[40vh]">
        {/* Aspect Ratio controls */}
        <div className="flex items-center justify-center gap-2 text-white overflow-x-auto py-2 px-2 hide-scrollbar">
          <button onClick={() => setAspect(undefined)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!aspect ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Tự do</button>
          <button onClick={() => setAspect(1)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${aspect === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>1:1</button>
          <button onClick={() => setAspect(4/3)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${aspect === 4/3 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>4:3</button>
          <button onClick={() => setAspect(16/9)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${aspect === 16/9 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>16:9</button>
          <button onClick={() => setAspect(3/4)} className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${aspect === 3/4 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>3:4</button>
        </div>

        <div className="flex items-center justify-between text-white px-2 sm:px-4">
          <span className="text-sm font-medium whitespace-nowrap mr-4">Thu phóng</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
        <div className="flex justify-between items-center px-2 sm:px-4 pt-2 pb-2">
          <button
            onClick={onCancel}
            className="p-2 sm:p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setRotation((prev) => prev + 90)}
              className="p-2 sm:p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-4 h-4" /> Gửi luôn
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="p-2 sm:p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              <Check className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
