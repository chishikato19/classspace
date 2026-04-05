import React from 'react';
import { WidgetProvider, useWidgets } from './WidgetContext';
import TimerWidget from './widgets/TimerWidget';
import NoiseWidget from './widgets/NoiseWidget';
import CalculatorWidget from './widgets/CalculatorWidget';
import RandomPickerWidget from './widgets/RandomPickerWidget';
import WhiteboardWidget from './widgets/WhiteboardWidget';
import { Clock, Mic, Calculator, Shuffle, PenTool, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dock = () => {
  const { openWidget, widgets, updateWidget } = useWidgets();
  const navigate = useNavigate();

  const tools = [
    { id: 'whiteboard', icon: PenTool, label: 'Bảng trắng', color: 'bg-blue-500' },
    { id: 'timer', icon: Clock, label: 'Đồng hồ', color: 'bg-amber-500' },
    { id: 'noise', icon: Mic, label: 'Tiếng ồn', color: 'bg-red-500' },
    { id: 'calculator', icon: Calculator, label: 'Máy tính', color: 'bg-emerald-500' },
    { id: 'randomPicker', icon: Shuffle, label: 'Quay số', color: 'bg-purple-500' },
  ] as const;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-gray-200/50 flex items-center gap-4 z-50">
      {tools.map(tool => {
        const Icon = tool.icon;
        const isOpen = widgets.some(w => w.type === tool.id);
        const isMinimized = widgets.some(w => w.type === tool.id && w.isMinimized);
        
        return (
          <div key={tool.id} className="relative group">
            <button
              onClick={() => {
                if (isOpen && !isMinimized) {
                  // If open and not minimized, minimize it
                  const widget = widgets.find(w => w.type === tool.id);
                  if (widget) updateWidget(widget.id, { isMinimized: true });
                } else {
                  openWidget(tool.id);
                }
              }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all duration-200 hover:-translate-y-2 hover:shadow-lg ${tool.color} ${isOpen && !isMinimized ? 'ring-2 ring-offset-2 ring-indigo-500' : ''} ${isMinimized ? 'opacity-50' : ''}`}
            >
              <Icon className="w-6 h-6" />
            </button>
            
            {/* Tooltip */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {tool.label}
            </div>
            
            {/* Active Indicator */}
            {isOpen && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-800 rounded-full" />
            )}
          </div>
        );
      })}
      
      <div className="w-px h-8 bg-gray-300 mx-2" />
      
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
      >
        <LogIn className="w-4 h-4" />
        Đăng nhập
      </button>
    </div>
  );
};

const Workspace = () => {
  const { widgets } = useWidgets();

  return (
    <div className="w-full h-screen bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center overflow-hidden relative">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 z-0 flex justify-between items-start pointer-events-none">
        <div className="text-white drop-shadow-md">
          <h1 className="text-3xl font-bold mb-1">Chế độ Khách</h1>
          <p className="text-white/80">Không gian làm việc cục bộ. Dữ liệu sẽ bị xóa khi đóng trình duyệt.</p>
        </div>
      </div>

      {/* Widgets */}
      {widgets.map(widget => {
        switch (widget.type) {
          case 'timer': return <TimerWidget key={widget.id} widget={widget} />;
          case 'noise': return <NoiseWidget key={widget.id} widget={widget} />;
          case 'calculator': return <CalculatorWidget key={widget.id} widget={widget} />;
          case 'randomPicker': return <RandomPickerWidget key={widget.id} widget={widget} />;
          case 'whiteboard': return <WhiteboardWidget key={widget.id} widget={widget} />;
          default: return null;
        }
      })}

      <Dock />
    </div>
  );
};

export default function GuestDashboard() {
  return (
    <WidgetProvider>
      <Workspace />
    </WidgetProvider>
  );
}
