import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentData } from '../services/classService';
import { soundService } from '../../game/services/soundService';

interface BingoCageProps {
  students: StudentData[];
  onSelect: (student: StudentData) => void;
  selectableIds: string[];
  hideSelected: boolean;
}

const COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
];

export default function BingoCage({ students, onSelect, selectableIds, hideSelected }: BingoCageProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [balls, setBalls] = useState<{ id: string; color: string; delay: number; x: number; y: number }[]>([]);
  const [showResult, setShowResult] = useState(false);

  // Filter students based on hideSelected
  const displayStudents = hideSelected 
    ? students.filter(s => selectableIds.includes(s.id))
    : students;

  useEffect(() => {
    // Initialize balls (max 50 for performance)
    const numBalls = Math.min(displayStudents.length, 50);
    const newBalls = Array.from({ length: numBalls }).map((_, i) => ({
      id: `ball-${i}`,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.5,
      x: (Math.random() - 0.5) * 160, // Initial random position inside cage
      y: 40 + Math.random() * 60,
    }));
    setBalls(newBalls);
  }, [displayStudents.length]);

  const handleSpin = () => {
    if (isSpinning || displayStudents.length === 0) return;
    
    setIsSpinning(true);
    setShowResult(false);
    setSelectedStudent(null);
    soundService.play('tick');

    // Select a random student
    const availableStudents = displayStudents.filter(s => selectableIds.includes(s.id));
    const targetList = availableStudents.length > 0 ? availableStudents : displayStudents;
    const winner = targetList[Math.floor(Math.random() * targetList.length)];

    // Spin duration
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedStudent(winner);
      soundService.play('correct');
      
      // Show result after ball drops
      setTimeout(() => {
        setShowResult(true);
        setTimeout(() => {
          onSelect(winner);
        }, 3000);
      }, 1000);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[600px] relative overflow-hidden bg-slate-900 rounded-2xl p-8">
      {/* Stage Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-300/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Bingo Cage Container */}
      <div className="relative w-80 h-80 mb-16 z-10">
        {/* Stand Base */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-64 h-12 border-b-8 border-l-8 border-r-8 border-slate-700 rounded-b-3xl shadow-2xl" />
        {/* Stand Pillars */}
        <div className="absolute top-1/2 -left-12 w-12 h-4 bg-slate-700 rounded-l-full shadow-lg" />
        <div className="absolute top-1/2 -right-12 w-12 h-4 bg-slate-700 rounded-r-full shadow-lg" />
        
        {/* Cage */}
        <motion.div 
          className="w-full h-full rounded-full border-8 border-slate-400 relative overflow-hidden bg-white/5 backdrop-blur-sm shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]"
          animate={{ rotate: isSpinning ? 360 * 8 : 0 }}
          transition={{ duration: 3, ease: "easeInOut" }}
        >
          {/* Grid lines to make it look like a cage */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_48%,rgba(255,255,255,0.3)_49%,rgba(255,255,255,0.3)_51%,transparent_52%),linear-gradient(90deg,transparent_48%,rgba(255,255,255,0.3)_49%,rgba(255,255,255,0.3)_51%,transparent_52%)] bg-[length:40px_40px]" />
          
          {/* Balls inside */}
          {balls.map((ball) => (
            <motion.div
              key={ball.id}
              className={`absolute w-10 h-10 rounded-full ${ball.color} shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.5),0_4px_10px_rgba(0,0,0,0.5)] border border-white/20 flex items-center justify-center`}
              style={{
                left: '50%',
                top: '50%',
                marginLeft: '-20px',
                marginTop: '-20px',
              }}
              animate={isSpinning ? {
                x: [ball.x, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 240, ball.x],
                y: [ball.y, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 240, (Math.random() - 0.5) * 240, ball.y],
              } : {
                x: ball.x,
                y: ball.y,
              }}
              transition={isSpinning ? {
                duration: 0.6,
                repeat: Infinity,
                repeatType: "mirror",
                delay: ball.delay,
                ease: "linear"
              } : {
                type: "spring",
                stiffness: 50,
                damping: 10
              }}
            >
               <div className="w-3 h-3 bg-white/40 rounded-full absolute top-1 left-2" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Dropped Ball & Result */}
      <div className="h-40 flex items-center justify-center relative w-full z-20">
        <AnimatePresence>
          {selectedStudent && !showResult && (
            <motion.div
              initial={{ y: -150, opacity: 0, scale: 0.5, rotate: -180 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
              exit={{ scale: 3, opacity: 0, filter: "blur(10px)" }}
              transition={{ type: "spring", bounce: 0.6, duration: 1 }}
              className="w-24 h-24 rounded-full bg-yellow-400 shadow-[inset_-8px_-8px_20px_rgba(0,0,0,0.4),0_10px_30px_rgba(250,204,21,0.6)] flex items-center justify-center border-4 border-yellow-200 relative overflow-hidden"
            >
              <div className="absolute top-2 left-4 w-6 h-6 bg-white/60 rounded-full blur-[2px]" />
              <span className="text-4xl font-black text-yellow-900">?</span>
            </motion.div>
          )}
          
          {showResult && selectedStudent && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-1.5 rounded-3xl shadow-[0_20px_50px_rgba(249,115,22,0.5)] transform hover:scale-105 transition-transform cursor-pointer" onClick={() => onSelect(selectedStudent)}>
                <div className="bg-white px-12 py-6 rounded-2xl flex flex-col items-center min-w-[300px]">
                  <span className="text-sm text-orange-500 font-bold uppercase tracking-widest mb-2">Người may mắn</span>
                  <span className="text-4xl font-black text-gray-900 text-center">{selectedStudent.name}</span>
                </div>
              </div>
              
              {/* Confetti particles */}
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div
                  key={`confetti-${i}`}
                  className={`absolute w-4 h-4 ${COLORS[i % COLORS.length]} rounded-sm`}
                  initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                  animate={{ 
                    x: (Math.random() - 0.5) * 800, 
                    y: (Math.random() - 0.5) * 800 - 200,
                    scale: Math.random() * 1.5 + 0.5,
                    rotate: Math.random() * 720,
                    opacity: [1, 1, 0]
                  }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning || displayStudents.length === 0}
        className={`mt-8 px-16 py-5 rounded-full font-black text-3xl tracking-widest text-white transition-all z-30
          ${isSpinning || displayStudents.length === 0 
            ? 'bg-slate-600 shadow-[0_8px_0_rgb(51,65,85)] cursor-not-allowed translate-y-2 shadow-[0_0_0_rgb(51,65,85)] opacity-80' 
            : 'bg-red-600 hover:bg-red-500 active:translate-y-2 active:shadow-[0_0_0_rgb(153,27,27)] shadow-[0_8px_0_rgb(153,27,27)] hover:shadow-[0_8px_0_rgb(185,28,28),0_0_30px_rgba(220,38,38,0.6)]'
          }`}
      >
        {isSpinning ? 'ĐANG QUAY...' : 'QUAY'}
      </button>
    </div>
  );
}
