import React, { useRef, useState } from 'react';
import { useWhiteboard } from '../state/WhiteboardContext';
import { MousePointer2, Hand, Pen, Eraser, Square, Scissors, Type, Image as ImageIcon, Trash2, FileText, Loader2, Palette, Layout, Grid, Minus, Maximize, ZoomIn, ZoomOut, Calculator, Undo2, Redo2, ChevronLeft, ChevronRight, Circle, ClipboardPaste } from 'lucide-react';
import { ToolType, ImageObject, BackgroundColor, BackgroundPattern, WidgetObject, ShapeType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { convertPdfToImages } from '../utils/pdfUtils';

export default function Toolbar() {
  const { state, dispatch } = useWhiteboard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-5 h-5" />, label: 'Chọn vùng' },
    { id: 'pan', icon: <Hand className="w-5 h-5" />, label: 'Di chuyển' },
    { id: 'pen', icon: <Pen className="w-5 h-5" />, label: 'Bút vẽ' },
    { id: 'eraser', icon: <Eraser className="w-5 h-5" />, label: 'Tẩy' },
    // Shape tool is handled separately
    { id: 'split', icon: <Scissors className="w-5 h-5" />, label: 'Cắt đề' },
    { id: 'text', icon: <Type className="w-5 h-5" />, label: 'Văn bản' },
  ];

  const shapes: { id: ShapeType; icon: React.ReactNode; label: string }[] = [
    { id: 'rectangle', icon: <Square className="w-5 h-5" />, label: 'Hình chữ nhật' },
    { id: 'circle', icon: <Circle className="w-5 h-5" />, label: 'Hình tròn' },
    { id: 'line', icon: <Minus className="w-5 h-5" />, label: 'Đoạn thẳng' },
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

  const handleColorChange = (color: string) => {
    dispatch({ type: 'SET_STROKE_COLOR', payload: color });
    
    // Update color of selected objects
    if (state.selectedIds.length > 0) {
      state.selectedIds.forEach(id => {
        const obj = state.objects.find(o => o.id === id);
        if (obj) {
          if (obj.type === 'text') {
            dispatch({ type: 'UPDATE_OBJECT', payload: { id, updates: { fill: color } } });
          } else if (obj.type === 'pen' || obj.type === 'shape') {
            dispatch({ type: 'UPDATE_OBJECT', payload: { id, updates: { stroke: color } } });
          }
        }
      });
    }
    setShowColorPicker(false);
  };

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

  const handlePasteClick = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        for (const imageType of imageTypes) {
          const blob = await clipboardItem.getType(imageType);
          const reader = new FileReader();
          reader.onload = (event) => {
            const src = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
              const centerX = (-state.pan.x + window.innerWidth / 2) / state.zoom;
              const centerY = (-state.pan.y + window.innerHeight / 2) / state.zoom;
              const newImage: ImageObject = {
                id: uuidv4(),
                type: 'image',
                src,
                x: centerX - (img.width > 800 ? 400 : img.width / 2),
                y: centerY - (img.width > 800 ? (img.height * 800) / img.width / 2 : img.height / 2),
                width: img.width > 800 ? 800 : img.width,
                height: img.width > 800 ? (img.height * 800) / img.width : img.height,
              };
              dispatch({ type: 'ADD_OBJECT', payload: newImage });
            };
            img.src = src;
          };
          reader.readAsDataURL(blob);
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      alert('Không thể dán ảnh từ clipboard. Vui lòng sử dụng phím tắt Ctrl+V hoặc chèn ảnh từ file.');
    }
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const addGeoGebra = () => {
    // Calculate center of current view
    const centerX = (-state.pan.x + window.innerWidth / 2) / state.zoom;
    const centerY = (-state.pan.y + window.innerHeight / 2) / state.zoom;

    const newWidget: WidgetObject = {
      id: uuidv4(),
      type: 'widget',
      widgetType: 'geogebra',
      url: 'https://www.geogebra.org/classic?embed',
      x: centerX - 400,
      y: centerY - 300,
      width: 800,
      height: 600,
    };
    dispatch({ type: 'ADD_OBJECT', payload: newWidget });
    dispatch({ type: 'SET_TOOL', payload: 'select' });
  };

  return (
    <div 
      className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center z-20 transition-transform duration-300"
      style={{ transform: isToolbarVisible ? 'translateX(1rem)' : 'translateX(calc(-100% + 1.5rem))' }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-2 grid grid-cols-2 gap-2 hide-scrollbar">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: tool.id })}
            className={`p-3 rounded-xl transition-all flex items-center justify-center ${
              state.activeTool === tool.id
                ? 'bg-indigo-100 text-indigo-600 shadow-inner'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}

        {/* Shape Picker Toggle */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => {
              setShowShapePicker(!showShapePicker);
              setShowColorPicker(false);
              setShowBgPicker(false);
              dispatch({ type: 'SET_TOOL', payload: 'shape' });
            }}
            className={`p-3 rounded-xl transition-all w-full flex items-center justify-center ${state.activeTool === 'shape' ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Hình học"
          >
            {state.activeShapeType === 'rectangle' ? <Square className="w-5 h-5" /> : state.activeShapeType === 'circle' ? <Circle className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
          </button>
          
          {showShapePicker && (
            <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 flex flex-col gap-2 w-16 z-50">
              {shapes.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => {
                    dispatch({ type: 'SET_SHAPE_TYPE', payload: shape.id });
                    setShowShapePicker(false);
                  }}
                  className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                    state.activeShapeType === shape.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={shape.label}
                >
                  {shape.icon}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="col-span-2 h-px bg-gray-200 my-1" />

        {/* Undo / Redo */}
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.past.length === 0}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${state.past.length === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          title="Hoàn tác (Undo)"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={state.future.length === 0}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${state.future.length === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          title="Làm lại (Redo)"
        >
          <Redo2 className="w-5 h-5" />
        </button>

        <div className="col-span-2 h-px bg-gray-200 my-1" />

        {/* Color Picker Toggle */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowBgPicker(false);
            }}
            className={`p-3 rounded-xl transition-all w-full flex items-center justify-center ${showColorPicker ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Màu sắc"
          >
            <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: state.strokeColor }} />
          </button>
          
          {showColorPicker && (
            <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 flex flex-wrap gap-2 w-36 z-50">
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
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => {
              setShowBgPicker(!showBgPicker);
              setShowColorPicker(false);
            }}
            className={`p-3 rounded-xl transition-all w-full flex items-center justify-center ${showBgPicker ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Nền bảng"
          >
            <Layout className="w-5 h-5" />
          </button>

          {showBgPicker && (
            <div className="absolute left-full ml-2 top-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex flex-col gap-4 w-48 z-50">
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

        <div className="col-span-2 h-px bg-gray-200 my-1" />
        
        {/* Zoom Controls */}
        <div className="col-span-2 flex items-center justify-center gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max(0.1, state.zoom / 1.2) })}
            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-medium text-gray-500 w-8 text-center">{Math.round(state.zoom * 100)}%</span>
          <button
            onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min(10, state.zoom * 1.2) })}
            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="col-span-2 h-px bg-gray-200 my-1" />

        <button
          onClick={addGeoGebra}
          className="p-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center justify-center"
          title="Chèn GeoGebra"
        >
          <Calculator className="w-5 h-5" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center justify-center"
          title="Chèn ảnh"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />
        
        <button
          onClick={() => pdfInputRef.current?.click()}
          disabled={isLoading}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${isLoading ? 'text-indigo-400 bg-indigo-50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          title="Chèn PDF"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
        </button>
        <input
          type="file"
          accept="application/pdf"
          ref={pdfInputRef}
          onChange={handlePdfUpload}
          className="hidden"
        />

        <button
          onClick={handlePasteClick}
          className="p-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center justify-center"
          title="Dán ảnh từ Clipboard"
        >
          <ClipboardPaste className="w-5 h-5" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center justify-center"
          title="Toàn màn hình"
        >
          <Maximize className="w-5 h-5" />
        </button>

        <div className="col-span-2 h-px bg-gray-200 my-1" />

        <button
          onClick={() => {
            if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ bảng?')) {
              dispatch({ type: 'CLEAR_BOARD' });
            }
          }}
          className="col-span-2 p-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center"
          title="Xóa toàn bộ bảng"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsToolbarVisible(!isToolbarVisible)}
        className="bg-white rounded-r-xl shadow-md border border-l-0 border-gray-200 w-6 h-16 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        title={isToolbarVisible ? "Ẩn thanh công cụ" : "Hiện thanh công cụ"}
      >
        {isToolbarVisible ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
