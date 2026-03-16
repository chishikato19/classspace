import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentData } from '../services/classService';
import { Play, RotateCcw, Crosshair } from 'lucide-react';

interface BalloonPopProps {
  students: StudentData[];
  onSelect: (student: StudentData) => void;
  selectableIds: string[];
  hideSelected: boolean;
}

export default function BalloonPop({ students, onSelect, selectableIds, hideSelected }: BalloonPopProps) {
  const [gameState, setGameState] = useState<'idle' | 'aiming' | 'popped' | 'done'>('idle');
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [balloons, setBalloons] = useState<{ id: string, student: StudentData, color: string, x: number, y: number, delay: number }[]>([]);
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });

  const displayStudents = hideSelected 
    ? students.filter(s => selectableIds.includes(s.id))
    : students;

  const displayStudentIds = displayStudents.map(s => s.id).join(',');

  useEffect(() => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-400', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
    // Increase to 80 balloons for a more crowded, fun screen
    const visualStudents = displayStudents.slice(0, 80);
    
    const newBalloons = visualStudents.map((student, i) => ({
      id: student.id,
      student,
      color: colors[i % colors.length],
      x: 5 + Math.random() * 90, // 5% to 95%
      y: 10 + Math.random() * 70, // 10% to 80%
      delay: Math.random() * 2
    }));
    setBalloons(newBalloons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayStudentIds]);

  const handleStart = () => {
    if (selectableIds.length === 0 || gameState !== 'idle') return;

    const randomIndex = Math.floor(Math.random() * selectableIds.length);
    const selectedId = selectableIds[randomIndex];
    const student = students.find(s => s.id === selectedId)!;
    
    setSelectedStudent(student);
    setGameState('aiming');

    // Find if student is in visual balloons, if not, pretend one of them is the target
    let targetBalloon = balloons.find(b => b.id === selectedId);
    if (!targetBalloon && balloons.length > 0) {
      targetBalloon = balloons[Math.floor(Math.random() * balloons.length)];
      // Swap the data so it pops the right name
      targetBalloon.student = student;
      targetBalloon.id = student.id;
    }

    if (targetBalloon) {
      setTargetPos({ x: targetBalloon.x, y: targetBalloon.y });
    } else {
      setTargetPos({ x: 50, y: 50 });
    }

    setTimeout(() => {
      setGameState('popped');
      setTimeout(() => {
        setGameState('done');
        setTimeout(() => {
          onSelect(student);
        }, 1500);
      }, 1000);
    }, 1500); // Aiming duration
  };

  const handleReset = () => {
    setGameState('idle');
    setSelectedStudent(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto">
      <div className="relative w-full aspect-[16/9] bg-sky-100 rounded-3xl border-4 border-sky-300 shadow-inner overflow-hidden mb-8">
        
        {/* Clouds background */}
        <div className="absolute top-10 left-10 w-20 h-8 bg-white rounded-full opacity-50 blur-sm" />
        <div className="absolute top-20 right-20 w-32 h-10 bg-white rounded-full opacity-50 blur-sm" />
        <div className="absolute bottom-20 left-1/3 w-24 h-8 bg-white rounded-full opacity-50 blur-sm" />

        {/* Balloons */}
        {balloons.map((balloon) => {
          const isTarget = selectedStudent?.id === balloon.id;
          const isPopped = isTarget && (gameState === 'popped' || gameState === 'done');
          const fadeOut = !isTarget && (gameState === 'popped' || gameState === 'done');

          return (
            <motion.div
              key={balloon.id}
              className="absolute flex flex-col items-center"
              initial={{ left: `${balloon.x}%`, top: `${balloon.y}%` }}
              animate={
                isPopped 
                  ? { scale: 2, opacity: 0 } 
                  : { 
                      y: gameState === 'idle' ? [0, -15, 0] : 0, // Freeze when aiming
                      opacity: fadeOut ? 0 : 1,
                      scale: fadeOut ? 0.8 : 1
                    }
              }
              transition={
                isPopped 
                  ? { duration: 0.2 } 
                  : { 
                      y: gameState === 'idle' 
                        ? { duration: 3, repeat: Infinity, ease: "easeInOut", delay: balloon.delay }
                        : { duration: 0.5, ease: "easeOut" },
                      opacity: { duration: 0.5 }
                    }
              }
              style={{ x: '-50%', y: '-50%' }}
            >
              {!isPopped && (
                <>
                  <div className={`w-10 h-14 rounded-[50%] ${balloon.color} shadow-md relative flex items-center justify-center`}>
                    <div className="absolute -bottom-1 w-2 h-2 border-t-4 border-t-transparent border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-current text-inherit opacity-80" style={{ color: balloon.color }}></div>
                  </div>
                  <div className="w-0.5 h-8 bg-gray-300/50 mt-1" />
                </>
              )}
            </motion.div>
          );
        })}

        {/* Dart / Crosshair */}
        <AnimatePresence>
          {gameState === 'aiming' && (
            <motion.div
              className="absolute z-20 text-red-600 drop-shadow-md"
              initial={{ left: '50%', top: '120%', scale: 0.5, opacity: 0 }}
              animate={{ left: `${targetPos.x}%`, top: `${targetPos.y}%`, scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.2, ease: "backOut" }}
              style={{ x: '-50%', y: '-50%' }}
            >
              <Crosshair className="w-16 h-16 animate-spin-slow" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner Reveal */}
        <AnimatePresence>
          {(gameState === 'popped' || gameState === 'done') && selectedStudent && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
            >
              <div className="bg-white/90 backdrop-blur-sm px-10 py-6 rounded-3xl shadow-2xl border-4 border-yellow-400 text-center transform -rotate-2">
                <p className="text-gray-500 font-bold mb-2 uppercase tracking-widest">Người may mắn</p>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
                  {selectedStudent.name}
                </h2>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {gameState === 'idle' || gameState === 'done' ? (
          <button
            onClick={gameState === 'done' ? handleReset : handleStart}
            disabled={selectableIds.length === 0}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              gameState === 'done' 
                ? 'bg-gray-600 hover:bg-gray-700' 
                : 'bg-pink-500 hover:bg-pink-600'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {gameState === 'done' ? (
              <>
                <RotateCcw className="w-6 h-6" />
                Chơi lại
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Bắn bóng
              </>
            )}
          </button>
        ) : (
          <div className="px-8 py-4 rounded-full font-bold text-pink-600 bg-pink-100 text-lg shadow-inner">
            Đang ngắm bắn...
          </div>
        )}
      </div>
    </div>
  );
}
