import React, { useRef, useState } from 'react';
import { useWhiteboard } from '../state/WhiteboardContext';
import { MousePointer2, Pen, Eraser, Square, Scissors, Type, Image as ImageIcon, Trash2, FileText, Loader2, Palette, Layout, Grid, Minus } from 'lucide-react';
import { ToolType, ImageObject, BackgroundColor, BackgroundPattern } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { convertPdfToImages } from '../utils/pdfUtils';

export default function Toolbar() {
  const { state, dispatch } = useWhiteboard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);

  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-5 h-5" />, label: 'Chọn' },
    { id: 'pen', icon: <Pen className="w-5 h-5" />, label: 'Bút vẽ' },
    { id: 'eraser', icon: <Eraser className="w-5 h-5" />, label: 'Tẩy' },
    { id: 'shape', icon: <Square className="w-5 h-5" />, label: 'Hình học' },
    { id: 'split', icon: <Scissors className="w-5 h-5" />, label: 'Cắt đề' },
    { id: 'text', icon: <Type className="w-5 h-5" />, label: 'Văn bản' },
  ];

  const colors = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#FFFFFF'];
  
  const bgColors: { id: BackgroundColor; color: string; label: string }[] = [
    { id: 'white', color: '#FFFFFF', label: 'Trắng' },
    { id: 'green', color: '#1e4d2b', label: 'Xanh' },
    { id: 'black', color: '#1a1a1a', label: 'Đen' },
  ];

  const bgPatterns: { id: BackgroundPattern; icon: React.ReactNode; label: string }[] = [
    { id: 'none', icon: <div className="w-4 h-4 border border-gray-300 rounded-sm" />, label: 'Trơn' },
    { id: 'grid', icon: <Grid className="w-4 h-4" />, label: 'Ô ly' },
    { id: 'lines', icon: <Minus className="w-4 h-4" />, label: 'Kẻ ngang' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newImage: ImageObject = {
          id: uuidv4(),
          type: 'image',
          src,
          x: 50,
          y: 50,
          width: img.width > 800 ? 800 : img.width,
          height: img.width > 800 ? (img.height * 800) / img.width : img.height,
        };
        dispatch({ type: 'ADD_OBJECT', payload: newImage });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const images = await convertPdfToImages(file);
      let currentY = 50;

      for (const src of images) {
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = () => {
            const width = img.width > 800 ? 800 : img.width;
            const height = img.width > 800 ? (img.height * 800) / img.width : img.height;
            
            const newImage: ImageObject = {
              id: uuidv4(),
              type: 'image',
              src,
              x: 50,
              y: currentY,
              width,
              height,
            };
            dispatch({ type: 'ADD_OBJECT', payload: newImage });
            currentY += height + 50; // Add gap between pages
            resolve(null);
          };
          img.src = src;
        });
      }
    } catch (error) {
      console.error('Error importing PDF:', error);
      alert('Có lỗi xảy ra khi nhập file PDF.');
    } finally {
      setIsLoading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-2 flex flex-col gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: tool.id })}
            className={`p-3 rounded-xl transition-all ${
              state.activeTool === tool.id
                ? 'bg-indigo-100 text-indigo-600 shadow-inner'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
        
        <div className="h-px bg-gray-200 my-1" />

        {/* Color Picker Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowBgPicker(false);
            }}
            className={`p-3 rounded-xl transition-all ${showColorPicker ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Màu sắc"
          >
            <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: state.strokeColor }} />
          </button>
          
          {showColorPicker && (
            <div className="absolute left-14 top-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 flex flex-wrap gap-2 w-36">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    dispatch({ type: 'SET_STROKE_COLOR', payload: color });
                    setShowColorPicker(false);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    state.strokeColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Background Picker Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBgPicker(!showBgPicker);
              setShowColorPicker(false);
            }}
            className={`p-3 rounded-xl transition-all ${showBgPicker ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Nền bảng"
          >
            <Layout className="w-5 h-5" />
          </button>

          {showBgPicker && (
            <div className="absolute left-14 top-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex flex-col gap-4 w-48">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Màu nền</p>
                <div className="flex gap-2">
                  {bgColors.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => dispatch({ type: 'SET_BACKGROUND_COLOR', payload: bg.id })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        state.backgroundColor === bg.id ? 'border-indigo-500 scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: bg.color }}
                      title={bg.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Họa tiết</p>
                <div className="flex gap-2">
                  {bgPatterns.map((pattern) => (
                    <button
                      key={pattern.id}
                      onClick={() => dispatch({ type: 'SET_BACKGROUND_PATTERN', payload: pattern.id })}
                      className={`p-2 rounded-lg border-2 transition-all flex-1 flex items-center justify-center ${
                        state.backgroundPattern === pattern.id ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                      title={pattern.label}
                    >
                      {pattern.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-gray-200 my-1" />
        
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
          title="Chèn ảnh"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        
        <input
          type="file"
          accept="application/pdf"
          ref={pdfInputRef}
          onChange={handlePdfUpload}
          className="hidden"
        />
        <button
          onClick={() => pdfInputRef.current?.click()}
          disabled={isLoading}
          className={`p-3 rounded-xl transition-all ${isLoading ? 'text-indigo-400 bg-indigo-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          title="Chèn PDF"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
        </button>

        <button
          onClick={() => {
            if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ bảng?')) {
              dispatch({ type: 'CLEAR_BOARD' });
            }
          }}
          className="p-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all mt-2"
          title="Xóa toàn bộ bảng"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
