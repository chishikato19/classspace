import React, { useState, useEffect, useRef } from 'react';
import FloatingWindow from '../components/FloatingWindow';
import { WidgetState } from '../WidgetContext';
import { Mic, MicOff } from 'lucide-react';

export default function NoiseWidget({ widget }: { widget: WidgetState }) {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [threshold, setThreshold] = useState(70);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;
      
      setIsListening(true);
      updateVolume();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập micro. Vui lòng kiểm tra quyền.");
    }
  };

  const stopListening = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    
    setIsListening(false);
    setVolume(0);
  };

  const updateVolume = () => {
    if (!analyzerRef.current) return;
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Convert to a roughly 0-100 scale
    const normalizedVolume = Math.min(100, Math.round((average / 128) * 100));
    setVolume(normalizedVolume);
    
    requestRef.current = requestAnimationFrame(updateVolume);
  };

  const isTooLoud = volume > threshold;

  return (
    <FloatingWindow widget={widget} title="Quản lý tiếng ồn" minWidth={300} minHeight={200}>
      <div className={`flex flex-col items-center justify-center h-full p-6 transition-colors duration-300 ${isTooLoud ? 'bg-red-50' : 'bg-white'}`}>
        
        <div className="w-full max-w-xs mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Yên tĩnh</span>
            <span>Ồn ào</span>
          </div>
          <div className="h-6 bg-gray-200 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-100 ${isTooLoud ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${volume}%` }}
            />
            {/* Threshold marker */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-black z-10"
              style={{ left: `${threshold}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Ngưỡng cảnh báo: {threshold}</label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={threshold} 
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="w-32"
            />
          </div>
        </div>

        {isTooLoud && (
          <div className="absolute top-4 right-4 animate-pulse text-red-600 font-bold">
            QUÁ ỒN!
          </div>
        )}
      </div>
    </FloatingWindow>
  );
}
