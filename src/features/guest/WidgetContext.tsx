import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type WidgetType = 'timer' | 'noise' | 'whiteboard' | 'calculator' | 'randomPicker';

export interface WidgetState {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
}

interface WidgetContextType {
  widgets: WidgetState[];
  openWidget: (type: WidgetType) => void;
  closeWidget: (id: string) => void;
  focusWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetState>) => void;
}

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: ReactNode }) {
  const [widgets, setWidgets] = useState<WidgetState[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(10);

  const openWidget = (type: WidgetType) => {
    // Check if already open (except whiteboard maybe, but let's allow multiple or single. Let's do single for now)
    const existing = widgets.find(w => w.type === type);
    if (existing) {
      focusWidget(existing.id);
      if (existing.isMinimized) {
        updateWidget(existing.id, { isMinimized: false });
      }
      return;
    }

    const newZIndex = maxZIndex + 1;
    setMaxZIndex(newZIndex);

    const defaultSizes: Record<WidgetType, { w: number, h: number }> = {
      timer: { w: 300, h: 250 },
      noise: { w: 400, h: 200 },
      whiteboard: { w: 800, h: 600 },
      calculator: { w: 300, h: 400 },
      randomPicker: { w: 350, h: 450 },
    };

    const size = defaultSizes[type];
    
    // Calculate center position
    const x = Math.max(0, (window.innerWidth - size.w) / 2 + (Math.random() * 40 - 20));
    const y = Math.max(0, (window.innerHeight - size.h) / 2 + (Math.random() * 40 - 20));

    const newWidget: WidgetState = {
      id: uuidv4(),
      type,
      x,
      y,
      width: size.w,
      height: size.h,
      zIndex: newZIndex,
      isMinimized: false,
      isMaximized: type === 'whiteboard', // Maximize whiteboard by default
    };

    setWidgets(prev => [...prev, newWidget]);
  };

  const closeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const focusWidget = (id: string) => {
    const newZIndex = maxZIndex + 1;
    setMaxZIndex(newZIndex);
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, zIndex: newZIndex } : w));
  };

  const updateWidget = (id: string, updates: Partial<WidgetState>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  return (
    <WidgetContext.Provider value={{ widgets, openWidget, closeWidget, focusWidget, updateWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgets() {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error('useWidgets must be used within a WidgetProvider');
  }
  return context;
}
