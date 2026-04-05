import React, { useState, useEffect } from 'react';
import FloatingWindow from '../components/FloatingWindow';
import { WidgetState } from '../WidgetContext';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function TimerWidget({ widget }: { widget: WidgetState }) {
  const [time, setTime] = useState(5 * 60); // 5 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [inputMinutes, setInputMinutes] = useState('5');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime((prev) => prev - 1);
      }, 1000);
    } else if (time === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, time]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetTime = () => {
    const mins = parseInt(inputMinutes) || 0;
    setTime(mins * 60);
    setIsRunning(false);
  };

  return (
    <FloatingWindow widget={widget} title="Đồng hồ đếm ngược" minWidth={250} minHeight={200}>
      <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50">
        <div className="text-6xl font-mono font-bold text-gray-800 mb-6 tracking-tight">
          {formatTime(time)}
        </div>
        
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors ${isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>
          <button 
            onClick={() => {
              setIsRunning(false);
              handleSetTime();
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <input 
            type="number" 
            value={inputMinutes}
            onChange={(e) => setInputMinutes(e.target.value)}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
            min="1"
          />
          <span className="text-gray-600">phút</span>
          <button 
            onClick={handleSetTime}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Đặt
          </button>
        </div>
      </div>
    </FloatingWindow>
  );
}
