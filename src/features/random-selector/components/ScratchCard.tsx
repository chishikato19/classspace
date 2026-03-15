import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentData } from '../services/classService';
import { Play, RotateCcw, CircleDollarSign, Sparkles } from 'lucide-react';

interface ScratchCardProps {
  students: StudentData[];
  onSelect: (student: StudentData) => void;
  selectableIds: string[];
  hideSelected: boolean;
}

export default function ScratchCard({ students, onSelect, selectableIds, hideSelected }: ScratchCardProps) {
  const [scratchState, setScratchState] = useState<'idle' | 'scratching' | 'done'>('idle');
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [scratchedBlocks, setScratchedBlocks] = useState<Set<number>>(new Set());
  const [coinPos, setCoinPos] = useState({ x: 50, y: 50 });

  const columns = 24;
  const rows = 12;
  const totalBlocks = columns * rows;

  const handleStart = () => {
    if (selectableIds.length === 0 || scratchState !== 'idle') return;

    const winnerId = selectableIds[Math.floor(Math.random() * selectableIds.length)];
    const winner = students.find(s => s.id === winnerId)!;
    setSelectedStudent(winner);
    setScratchState('scratching');
    setScratchedBlocks(new Set());

    let progress = 0;
    let currentBlocks = new Set<number>();
    
    // Animation loop for scratching
    const interval = setInterval(() => {
      progress += 0.015; // Controls speed of scratching
      
      if (progress >= 1) {
        clearInterval(interval);
        // Reveal all remaining blocks quickly
        setTimeout(() => {
          const allBlocks = new Set<number>();
          for(let i = 0; i < totalBlocks; i++) allBlocks.add(i);
          setScratchedBlocks(allBlocks);
          setScratchState('done');
          
          setTimeout(() => {
            onSelect(winner);
          }, 1500);
        }, 300);
        return;
      }

      // Calculate coin position (zigzag path)
      const y = 10 + progress * 80; // Moves from 10% to 90% vertically
      const x = 50 + Math.sin(progress * Math.PI * 9) * 40; // Oscillates horizontally
      setCoinPos({ x, y });

      // Scratch blocks near the coin
      const radiusX = 12; // Scratch radius X in percentage
      const radiusY = 18; // Scratch radius Y in percentage
      const newBlocks = new Set(currentBlocks);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const blockX = (c + 0.5) * (100 / columns);
          const blockY = (r + 0.5) * (100 / rows);
          
          const dx = blockX - x;
          const dy = blockY - y;
          
          // Elliptical collision detection
          if ((dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1) {
            newBlocks.add(r * columns + c);
          }
        }
      }
      
      currentBlocks = newBlocks;
      setScratchedBlocks(currentBlocks);
    }, 40); // 40ms per frame
  };

  const handleReset = () => {
    setScratchState('idle');
    setSelectedStudent(null);
    setScratchedBlocks(new Set());
    setCoinPos({ x: 50, y: 50 });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
      {/* Ticket Container */}
      <div className="relative w-full bg-gradient-to-br from-yellow-100 to-orange-100 rounded-3xl border-8 border-yellow-400 shadow-2xl overflow-hidden mb-8 p-6">
        
        {/* Ticket Header */}
        <div className="text-center mb-6 border-b-4 border-yellow-300 pb-4 border-dashed">
          <h2 className="text-3xl font-black text-orange-600 uppercase tracking-widest flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Thẻ Cào May Mắn
            <Sparkles className="w-8 h-8 text-yellow-500" />
          </h2>
          <p className="text-orange-800/60 font-bold mt-1">Cào để tìm ra người chiến thắng!</p>
        </div>

        {/* Scratch Area */}
        <div className="relative w-full aspect-[21/9] bg-white rounded-2xl border-4 border-gray-200 overflow-hidden shadow-inner flex items-center justify-center isolate">
          
          {/* Hidden Content (Winner Name) - z-10 to stay behind coating */}
          <div className="absolute inset-0 flex items-center justify-center p-4 z-10 pointer-events-none">
            {selectedStudent ? (
              <motion.div 
                className="text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: scratchState === 'done' ? 1.1 : 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                <h3 className="text-5xl font-black text-orange-500 drop-shadow-md">
                  {selectedStudent.name}
                </h3>
              </motion.div>
            ) : (
              <div className="text-4xl font-black text-gray-300 tracking-widest">
                ???
              </div>
            )}
          </div>

          {/* Silver Scratch Coating (Grid of blocks) - z-20 to cover the name */}
          <div 
            className="absolute inset-0 grid z-20" 
            style={{ 
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: totalBlocks }).map((_, index) => {
              const isScratched = scratchedBlocks.has(index);
              return (
                <motion.div
                  key={index}
                  className="w-full h-full border-r border-b border-gray-500/30"
                  initial={false}
                  animate={{ 
                    opacity: isScratched ? 0 : 1,
                    scale: isScratched ? 0.5 : 1,
                  }}
                  transition={{ duration: 0.15 }}
                  style={{
                    backgroundColor: isScratched ? 'transparent' : '#9ca3af',
                    backgroundImage: !isScratched ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 8px)' : 'none'
                  }}
                />
              );
            })}
          </div>

          {/* Moving Coin - z-30 to be on top of everything */}
          <AnimatePresence>
            {scratchState === 'scratching' && (
              <motion.div
                className="absolute z-30 text-yellow-500 drop-shadow-lg"
                animate={{ 
                  left: `${coinPos.x}%`, 
                  top: `${coinPos.y}%`,
                  rotate: [0, -20, 20, 0]
                }}
                transition={{ 
                  left: { type: 'tween', duration: 0.05 },
                  top: { type: 'tween', duration: 0.05 },
                  rotate: { repeat: Infinity, duration: 0.5 }
                }}
                style={{ x: '-50%', y: '-50%' }}
              >
                <CircleDollarSign className="w-16 h-16 fill-yellow-100" />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {scratchState === 'idle' || scratchState === 'done' ? (
          <button
            onClick={scratchState === 'done' ? handleReset : handleStart}
            disabled={selectableIds.length === 0}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              scratchState === 'done' 
                ? 'bg-gray-600 hover:bg-gray-700' 
                : 'bg-orange-500 hover:bg-orange-600'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {scratchState === 'done' ? (
              <>
                <RotateCcw className="w-6 h-6" />
                Cào thẻ khác
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Bắt đầu cào
              </>
            )}
          </button>
        ) : (
          <div className="px-8 py-4 rounded-full font-bold text-orange-600 bg-orange-100 text-lg shadow-inner flex items-center gap-2">
            <Sparkles className="w-5 h-5 animate-spin-slow" /> Đang cào...
          </div>
        )}
      </div>
    </div>
  );
}
