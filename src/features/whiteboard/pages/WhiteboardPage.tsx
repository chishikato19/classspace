import React from 'react';
import { WhiteboardProvider, useWhiteboard } from '../state/WhiteboardContext';
import WhiteboardCanvas from '../core/WhiteboardCanvas';
import Toolbar from '../ui/Toolbar';
import { Trash2 } from 'lucide-react';

const Header = () => {
  const { dispatch } = useWhiteboard();

  return (
    <div className="absolute top-0 left-0 w-full h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10 flex items-center px-6 justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-800">Bảng trắng thông minh</h1>
        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">Beta</span>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ bảng?')) {
              dispatch({ type: 'CLEAR_BOARD' });
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Xóa tất cả
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Lưu bảng
        </button>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          Chia sẻ
        </button>
      </div>
    </div>
  );
};

export default function WhiteboardPage() {
  return (
    <WhiteboardProvider>
      <div className="relative w-full h-screen bg-gray-50 overflow-hidden">
        <Header />

        {/* Main Canvas Area */}
        <div className="w-full h-full pt-14 relative">
          <WhiteboardCanvas />
          <Toolbar />
        </div>
      </div>
    </WhiteboardProvider>
  );
}
