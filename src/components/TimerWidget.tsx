import React, { useState } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { Timer, X, Minimize2, Maximize2, Play, Pause, RotateCcw, Settings2 } from 'lucide-react';

export const TimerWidget: React.FC = () => {
  const {
    isTimerVisible,
    setTimerVisible,
    timeLeft,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    warningTime,
    setWarningTime
  } = useTimer();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom time inputs
  const [inputMinutes, setInputMinutes] = useState(5);
  const [inputSeconds, setInputSeconds] = useState(0);

  if (!isTimerVisible) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetCustomTime = () => {
    const totalSeconds = inputMinutes * 60 + inputSeconds;
    if (totalSeconds > 0) {
      resetTimer(totalSeconds);
      setShowSettings(false);
    }
  };

  const isWarning = timeLeft > 0 && timeLeft <= warningTime;
  const isEnded = timeLeft === 0;

  if (isMinimized) {
    return (
      <div 
        className={`fixed bottom-4 left-4 z-50 px-4 py-2 rounded-full shadow-2xl cursor-pointer transition-all duration-300 flex items-center gap-2 font-mono font-bold text-lg ${
          isEnded ? 'bg-red-600 text-white animate-pulse' : 
          isWarning ? 'bg-yellow-500 text-black animate-pulse' : 
          'bg-gray-800 text-white hover:bg-gray-700'
        }`}
        onClick={() => setIsMinimized(false)}
      >
        <Timer className="w-5 h-5" />
        {formatTime(timeLeft)}
      </div>
    );
  }

  const wrapperClasses = isFullScreen
    ? `fixed inset-0 z-[100] bg-gray-900 flex flex-col transition-colors duration-300 ${isEnded ? 'bg-red-900' : isWarning ? 'bg-yellow-900' : ''}`
    : `fixed bottom-4 left-4 z-50 w-80 bg-gray-900 rounded-2xl shadow-2xl border-2 overflow-hidden transition-colors duration-300 ${isEnded ? 'border-red-500' : isWarning ? 'border-yellow-500' : 'border-gray-700'}`;

  const headerClasses = isFullScreen
    ? `flex items-center justify-between p-6 ${isEnded ? 'bg-red-900/50' : isWarning ? 'bg-yellow-900/50' : 'bg-gray-800/50'}`
    : `flex items-center justify-between p-3 border-b ${isEnded ? 'bg-red-900/50 border-red-800' : isWarning ? 'bg-yellow-900/50 border-yellow-800' : 'bg-gray-800 border-gray-700'}`;

  const timerTextClasses = isFullScreen
    ? `text-[20vw] font-mono font-black tracking-wider mb-12 ${isEnded ? 'text-red-500 animate-pulse' : isWarning ? 'text-yellow-500' : 'text-white'}`
    : `text-6xl font-mono font-black tracking-wider mb-6 ${isEnded ? 'text-red-500 animate-pulse' : isWarning ? 'text-yellow-500' : 'text-white'}`;

  return (
    <div className={wrapperClasses}>
      {/* Header */}
      <div className={headerClasses}>
        <div className="flex items-center gap-2">
          <Timer className={`w-5 h-5 ${isEnded ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-gray-400'}`} />
          <h3 className={`font-bold text-white ${isFullScreen ? 'text-xl' : 'text-sm'}`}>Đồng hồ đếm ngược</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSettings(!showSettings)} className={`p-1 rounded ${showSettings ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'}`}>
            <Settings2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-1 text-gray-400 hover:text-white rounded">
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {!isFullScreen && (
            <button onClick={() => setIsMinimized(true)} className="p-1 text-gray-400 hover:text-white rounded">
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => { setTimerVisible(false); setIsFullScreen(false); }} className="p-1 text-gray-400 hover:text-red-400 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`p-4 ${isFullScreen ? 'flex-1 flex flex-col items-center justify-center' : ''}`}>
        {showSettings ? (
          <div className={`space-y-4 animate-in fade-in slide-in-from-top-2 ${isFullScreen ? 'max-w-md w-full' : ''}`}>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cài đặt thời gian</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input 
                    type="number" 
                    min="0" 
                    value={inputMinutes} 
                    onChange={(e) => setInputMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-center"
                  />
                  <div className="text-center text-xs text-gray-500 mt-1">Phút</div>
                </div>
                <div className="text-xl font-bold text-gray-500 py-1">:</div>
                <div className="flex-1">
                  <input 
                    type="number" 
                    min="0" 
                    max="59" 
                    value={inputSeconds} 
                    onChange={(e) => setInputSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-center"
                  />
                  <div className="text-center text-xs text-gray-500 mt-1">Giây</div>
                </div>
              </div>
              <button 
                onClick={handleSetCustomTime}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-sm transition-colors"
              >
                Áp dụng
              </button>
            </div>
            
            <div className="pt-4 border-t border-gray-800">
              <label className="block text-xs text-gray-400 mb-1">Cảnh báo khi còn (giây)</label>
              <input 
                type="number" 
                min="0" 
                value={warningTime} 
                onChange={(e) => setWarningTime(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
              />
            </div>
            
            <div className="pt-2 flex gap-2 flex-wrap">
              <button onClick={() => resetTimer(60)} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded text-gray-300">1 Phút</button>
              <button onClick={() => resetTimer(300)} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded text-gray-300">5 Phút</button>
              <button onClick={() => resetTimer(600)} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded text-gray-300">10 Phút</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={timerTextClasses}>
              {formatTime(timeLeft)}
            </div>
            
            <div className={`flex items-center gap-4 ${isFullScreen ? 'scale-150' : ''}`}>
              <button 
                onClick={() => resetTimer(inputMinutes * 60 + inputSeconds)}
                className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
                title="Đặt lại"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <button 
                onClick={isRunning ? pauseTimer : startTimer}
                disabled={timeLeft === 0}
                className={`p-4 rounded-full transition-transform active:scale-95 ${
                  timeLeft === 0 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
                  isRunning ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-green-500 hover:bg-green-400 text-black'
                }`}
              >
                {isRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
