import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { Check, X, RotateCw } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      alert('Có lỗi khi cắt ảnh.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={4 / 3} // Optional: remove aspect to allow free cropping, but free cropping requires a bit more setup in react-easy-crop. Let's remove aspect for free crop.
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
        />
      </div>
      <div className="bg-gray-900 p-4 flex flex-col gap-4 pb-safe">
        <div className="flex items-center justify-between text-white px-4">
          <span className="text-sm">Thu phóng</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-1/2"
          />
        </div>
        <div className="flex justify-between items-center px-4">
          <button
            onClick={onCancel}
            className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => setRotation((prev) => prev + 90)}
            className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-700"
          >
            <RotateCw className="w-6 h-6" />
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
