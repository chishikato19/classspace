import React from 'react';
import { useWhiteboard } from '../state/WhiteboardContext';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function PropertiesPanel() {
  const { state, dispatch } = useWhiteboard();

  const handleZoom = (delta: number) => {
    const newZoom = Math.min(Math.max(state.zoom + delta, 0.1), 5);
    dispatch({ type: 'SET_ZOOM', payload: newZoom });
  };

  const resetZoom = () => {
    dispatch({ type: 'SET_ZOOM', payload: 1 });
    dispatch({ type: 'SET_PAN', payload: { x: 0, y: 0 } });
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 flex flex-col gap-4 z-10 w-48">
      {/* Zoom Controls */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Thu phóng</h3>
          <button
            onClick={resetZoom}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
            title="Đặt lại"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center font-mono text-xs font-bold text-indigo-600 bg-indigo-50 py-1.5 rounded-lg">
            {Math.round(state.zoom * 100)}%
          </div>
          <button
            onClick={() => handleZoom(0.1)}
            className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
