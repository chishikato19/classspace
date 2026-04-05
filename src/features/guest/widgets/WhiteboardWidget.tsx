import React from 'react';
import FloatingWindow from '../components/FloatingWindow';
import { WidgetState } from '../WidgetContext';
import { WhiteboardProvider } from '../../whiteboard/state/WhiteboardContext';
import WhiteboardCanvas from '../../whiteboard/core/WhiteboardCanvas';
import Toolbar from '../../whiteboard/ui/Toolbar';

export default function WhiteboardWidget({ widget }: { widget: WidgetState }) {
  return (
    <FloatingWindow widget={widget} title="Bảng trắng" minWidth={600} minHeight={400}>
      <WhiteboardProvider>
        <div className="w-full h-full relative flex flex-col">
          <div className="flex-1 relative overflow-hidden">
            <WhiteboardCanvas />
            <Toolbar />
          </div>
        </div>
      </WhiteboardProvider>
    </FloatingWindow>
  );
}
