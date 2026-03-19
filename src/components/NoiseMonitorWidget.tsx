import React, { useState, useEffect, useRef } from 'react';
import { useNoiseMonitor } from '../contexts/NoiseMonitorContext';
import { Mic, MicOff, Volume2, AlertTriangle, X, Settings2, Minimize2, Maximize2 } from 'lucide-react';

export const NoiseMonitorWidget: React.FC = () => {
  const {
    isMonitoring,
    volume,
    threshold,
    startMonitoring,
    stopMonitoring,
    setThreshold,
    isWidgetVisible,
    setWidgetVisible,
    error
  } = useNoiseMonitor();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);

  const isOverThreshold = isMonitoring && volume > threshold;

  // Visual warning logic
  useEffect(() => {
    if (isOverThreshold) {
      setIsWarning(true);
      const timer = setTimeout(() => setIsWarning(false), 2000); // Keep warning for 2s
      return () => clearTimeout(timer);
    }
  }, [isOverThreshold]);

  // Audio warning logic
  useEffect(() => {
    if (isOverThreshold) {
      if (!intervalRef.current) {
        try {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          
          const playBeep = () => {
            const ctx = audioCtxRef.current;
            if (!ctx || ctx.state === 'closed') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, ctx.currentTime); // Warning pitch
            
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
          };

          playBeep();
          intervalRef.current = window.setInterval(playBeep, 400);
        } catch (e) {
          console.error("Audio playback failed", e);
        }
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }
  }, [isOverThreshold]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, []);

  if (!isWidgetVisible) return null;

  const getVolumeColor = () => {
    if (volume > threshold) return 'bg-red-500';
    if (volume > threshold * 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isMinimized) {
    return (
      <div 
        className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-2xl cursor-pointer transition-all duration-300 ${isWarning ? 'bg-red-600 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'}`}
        onClick={() => setIsMinimized(false)}
      >
        {isMonitoring ? (
          <Volume2 className={`w-6 h-6 ${isWarning ? 'text-white' : 'text-green-400'}`} />
        ) : (
          <MicOff className="w-6 h-6 text-gray-400" />
        )}
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-80 bg-gray-900 rounded-2xl shadow-2xl border-2 overflow-hidden transition-colors duration-300 ${isWarning ? 'border-red-500' : 'border-gray-700'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${isWarning ? 'bg-red-900/50 border-red-800' : 'bg-gray-800 border-gray-700'}`}>
        <div className="flex items-center gap-2">
          {isWarning ? <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /> : <Mic className="w-5 h-5 text-gray-400" />}
          <h3 className="font-bold text-sm text-white">Quản lý tiếng ồn</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1 text-gray-400 hover:text-white rounded">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => setWidgetVisible(false)} className="p-1 text-gray-400 hover:text-red-400 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-2 bg-red-900/50 border border-red-500 rounded text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Trạng thái</span>
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
              isMonitoring ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isMonitoring ? 'Dừng đo' : 'Bắt đầu'}
          </button>
        </div>

        {/* Volume Meter */}
        <div className="mb-6 relative">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Yên tĩnh</span>
            <span>Ồn ào</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-100 ease-out ${getVolumeColor()}`}
              style={{ width: `${Math.min(100, volume)}%` }}
            />
            {/* Threshold Marker */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white z-10"
              style={{ left: `${threshold}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="text-center mt-2 text-2xl font-mono font-bold text-white">
            {Math.round(volume)} <span className="text-xs text-gray-500 font-sans">dB (tương đối)</span>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Settings2 className="w-4 h-4" />
              <span>Ngưỡng cảnh báo</span>
            </div>
            <span className="text-xs font-bold text-yellow-500">{threshold}</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="100" 
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
        </div>
      </div>

      {/* Full Screen Warning Overlay (Optional, can be added if needed) */}
      {isWarning && (
        <div className="absolute inset-0 pointer-events-none border-4 border-red-500 rounded-2xl animate-pulse z-50"></div>
      )}
    </div>
  );
};
