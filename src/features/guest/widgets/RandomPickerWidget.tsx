import React from 'react';
import FloatingWindow from '../components/FloatingWindow';
import { WidgetState } from '../WidgetContext';
import RandomSelector from '../../random-selector/pages/RandomSelector';

export default function RandomPickerWidget({ widget }: { widget: WidgetState }) {
  return (
    <FloatingWindow widget={widget} title="Quay số ngẫu nhiên" minWidth={800} minHeight={600}>
      <div className="w-full h-full overflow-auto bg-gray-50">
        <RandomSelector isGuestMode={true} />
      </div>
    </FloatingWindow>
  );
}
