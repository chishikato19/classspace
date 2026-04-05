import React, { ReactNode, useRef, useEffect } from 'react';
import { motion, useDragControls } from 'motion/react';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
import { useWidgets, WidgetState } from '../WidgetContext';

interface FloatingWindowProps {
  widget: WidgetState;
  title: string;
  children: ReactNode;
  minWidth?: number;
  minHeight?: number;
}

export default function FloatingWindow({ widget, title, children, minWidth = 200, minHeight = 150 }: FloatingWindowProps) {
  const { closeWidget, focusWidget, updateWidget } = useWidgets();
  const dragControls = useDragControls();
  const windowRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    focusWidget(widget.id);
    dragControls.start(e);
  };

  if (widget.isMinimized) {
    return null; // Minimized widgets are handled by the dock
  }

  const isMax = widget.isMaximized;

  return (
    <motion.div
      ref={windowRef}
      drag={!isMax}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={(e, info) => {
        if (!isMax) {
          updateWidget(widget.id, {
            x: widget.x + info.offset.x,
            y: widget.y + info.offset.y,
          });
        }
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: isMax ? 0 : widget.x,
        y: isMax ? 0 : widget.y,
        width: isMax ? '100vw' : widget.width,
        height: isMax ? '100vh' : widget.height,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'absolute',
        zIndex: widget.zIndex,
        top: 0,
        left: 0,
      }}
      className={`bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 ${isMax ? 'rounded-none border-none' : ''}`}
      onPointerDown={() => focusWidget(widget.id)}
    >
      {/* Title Bar */}
      <div 
        className="h-10 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-3 select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
      >
        <div className="font-medium text-gray-700 text-sm">{title}</div>
        <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <button 
            onClick={() => updateWidget(widget.id, { isMinimized: true })}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => updateWidget(widget.id, { isMaximized: !widget.isMaximized })}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
          >
            {isMax ? <Square className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => closeWidget(widget.id)}
            className="p-1 hover:bg-red-500 hover:text-white rounded text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative bg-white">
        {children}
      </div>

      {/* Resize Handle (Bottom Right) */}
      {!isMax && (
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            focusWidget(widget.id);
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = widget.width;
            const startHeight = widget.height;

            const onPointerMove = (moveEvent: PointerEvent) => {
              const newWidth = Math.max(minWidth, startWidth + moveEvent.clientX - startX);
              const newHeight = Math.max(minHeight, startHeight + moveEvent.clientY - startY);
              updateWidget(widget.id, { width: newWidth, height: newHeight });
            };

            const onPointerUp = () => {
              window.removeEventListener('pointermove', onPointerMove);
              window.removeEventListener('pointerup', onPointerUp);
            };

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
          }}
        >
          <svg viewBox="0 0 10 10" className="w-full h-full text-gray-400 opacity-50">
            <path d="M 8 10 L 10 8 L 10 10 Z M 4 10 L 10 4 L 10 6 L 6 10 Z M 0 10 L 10 0 L 10 2 L 2 10 Z" fill="currentColor" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
