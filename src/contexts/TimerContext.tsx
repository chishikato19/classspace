import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TimerContextType {
  isTimerVisible: boolean;
  setTimerVisible: (val: boolean) => void;
  timeLeft: number;
  setTimeLeft: (val: number) => void;
  isRunning: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (seconds: number) => void;
  warningTime: number;
  setWarningTime: (val: number) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTimerVisible, setTimerVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // Default 5 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [warningTime, setWarningTime] = useState(60); // Default 1 minute warning

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          
          // Play end sound
          if (next === 0) {
            playEndSound();
            setIsRunning(false);
          }
          // Play double beep when <= 10 seconds
          else if (next <= 10 && next > 0) {
            playDoubleBeep();
          }
          // Play warning sound every 5 seconds during warning period
          else if (next <= warningTime && next % 5 === 0) {
            playWarningSound();
          }
          
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, warningTime]);

  const playWarningSound = () => {
    const audio = new Audio('/sounds/warning.mp3'); // We'll just use a generic beep or synthesize one
    // Synthesize a beep if no file exists
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error(e);
    }
  };

  const playEndSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const playDoubleBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = (startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, startTime); // E5
        gain.gain.setValueAtTime(0.1, startTime);
        osc.start(startTime);
        osc.stop(startTime + 0.15);
      };
      playBeep(ctx.currentTime);
      playBeep(ctx.currentTime + 0.25);
    } catch (e) {
      console.error(e);
    }
  };

  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);
  const resetTimer = (seconds: number) => {
    setIsRunning(false);
    setTimeLeft(seconds);
  };

  return (
    <TimerContext.Provider
      value={{
        isTimerVisible,
        setTimerVisible,
        timeLeft,
        setTimeLeft,
        isRunning,
        startTimer,
        pauseTimer,
        resetTimer,
        warningTime,
        setWarningTime
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
