import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface NoiseMonitorContextType {
  isMonitoring: boolean;
  volume: number;
  threshold: number;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  setThreshold: (val: number) => void;
  isWidgetVisible: boolean;
  setWidgetVisible: (val: boolean) => void;
  error: string | null;
}

const NoiseMonitorContext = createContext<NoiseMonitorContextType | undefined>(undefined);

export const NoiseMonitorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [volume, setVolume] = useState(0);
  const [threshold, setThreshold] = useState(70); // Default threshold
  const [isWidgetVisible, setWidgetVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);

  const startMonitoring = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsMonitoring(true);
      setWidgetVisible(true);
      updateVolume();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Không thể truy cập micro. Vui lòng cấp quyền trong trình duyệt.');
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsMonitoring(false);
    setVolume(0);
  };

  const updateVolume = () => {
    if (!analyserRef.current || !isMonitoring) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Map average (0-255) to a 0-100 scale
    const normalizedVolume = Math.min(100, Math.round((average / 255) * 100 * 1.5)); // 1.5 multiplier for better sensitivity

    setVolume(normalizedVolume);
    requestRef.current = requestAnimationFrame(updateVolume);
  };

  useEffect(() => {
    if (isMonitoring) {
      requestRef.current = requestAnimationFrame(updateVolume);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  return (
    <NoiseMonitorContext.Provider
      value={{
        isMonitoring,
        volume,
        threshold,
        startMonitoring,
        stopMonitoring,
        setThreshold,
        isWidgetVisible,
        setWidgetVisible,
        error
      }}
    >
      {children}
    </NoiseMonitorContext.Provider>
  );
};

export const useNoiseMonitor = () => {
  const context = useContext(NoiseMonitorContext);
  if (context === undefined) {
    throw new Error('useNoiseMonitor must be used within a NoiseMonitorProvider');
  }
  return context;
};
