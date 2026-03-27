import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentData } from '../services/classService';
import { Play, RotateCcw, Flag, Trophy } from 'lucide-react';

interface MiniRaceProps {
  students: StudentData[];
  onSelect: (student: StudentData) => void;
  selectableIds: string[];
  hideSelected: boolean;
}

interface Racer {
  id: string;
  student: StudentData;
  color: string;
  targetProgress: number; // 0 to 100
  duration: number;
}

export default function MiniRace({ students, onSelect, selectableIds, hideSelected }: MiniRaceProps) {
  const [raceState, setRaceState] = useState<'idle' | 'ready' | 'racing' | 'done'>('idle');
  const [racers, setRacers] = useState<Racer[]>([]);
  const [winner, setWinner] = useState<StudentData | null>(null);

  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];

  const handleStart = () => {
    if (selectableIds.length === 0 || raceState !== 'idle') return;

    // Pick winner
    const winnerId = selectableIds[Math.floor(Math.random() * selectableIds.length)];
    const winnerStudent = students.find(s => s.id === winnerId)!;
    setWinner(winnerStudent);

    // Pick 7 other random students for the race (total 8)
    const otherIds = selectableIds.filter(id => id !== winnerId);
    // Shuffle otherIds
    const shuffledOthers = [...otherIds].sort(() => 0.5 - Math.random());
    const selectedOthers = shuffledOthers.slice(0, 7).map(id => students.find(s => s.id === id)!);
    
    // If we don't have enough in selectable, fill from all students
    if (selectedOthers.length < 7) {
      const remainingNeeded = 7 - selectedOthers.length;
      const fillerStudents = students.filter(s => s.id !== winnerId && !selectedOthers.find(o => o.id === s.id));
      const shuffledFillers = [...fillerStudents].sort(() => 0.5 - Math.random());
      selectedOthers.push(...shuffledFillers.slice(0, remainingNeeded));
    }

    const allRaceStudents = [winnerStudent, ...selectedOthers];
    // Shuffle the lanes
    allRaceStudents.sort(() => 0.5 - Math.random());

    const newRacers: Racer[] = allRaceStudents.map((student, index) => {
      const isWinner = student.id === winnerId;
      return {
        id: student.id + '-' + index,
        student,
        color: colors[index % colors.length],
        targetProgress: isWinner ? 100 : 70 + Math.random() * 25,
        duration: 5 // Fixed duration, but we'll use keyframes for speed variation
      };
    });

    setRacers(newRacers);
    setRaceState('ready');

    // Start lights sequence
    setTimeout(() => {
      setRaceState('racing');
      
      // End race
      setTimeout(() => {
        setRaceState('done');
        setTimeout(() => {
          onSelect(winnerStudent);
        }, 2000);
      }, 5500); // Wait for racers to finish
    }, 1500);
  };

  const handleReset = () => {
    setRaceState('idle');
    setWinner(null);
    setRacers([]);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="relative w-full bg-gray-800 rounded-3xl border-8 border-gray-900 shadow-2xl overflow-hidden mb-8 p-4">
        
        {/* Track Lines */}
        <div className="absolute top-0 bottom-0 right-12 w-4 border-x-4 border-dashed border-white/50 z-0" />
        <div className="absolute top-0 bottom-0 right-16 w-4 border-x-4 border-dashed border-white/50 z-0" />
        
        {/* Traffic Lights */}
        <AnimatePresence>
          {raceState === 'ready' && (
            <motion.div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-gray-900 p-4 rounded-2xl flex gap-4 border-4 border-gray-700 shadow-2xl"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
            >
              <motion.div className="w-12 h-12 rounded-full bg-red-500" animate={{ opacity: [0.3, 1, 1] }} transition={{ duration: 1.5, times: [0, 0.3, 1] }} />
              <motion.div className="w-12 h-12 rounded-full bg-yellow-500" animate={{ opacity: [0.3, 0.3, 1] }} transition={{ duration: 1.5, times: [0, 0.6, 1] }} />
              <motion.div className="w-12 h-12 rounded-full bg-green-500" animate={{ opacity: [0.3, 0.3, 1] }} transition={{ duration: 1.5, times: [0, 0.9, 1] }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Racers */}
        <div className="flex flex-col gap-4 relative z-10 py-4">
          {raceState === 'idle' ? (
            <div className="h-64 flex items-center justify-center text-gray-400 font-bold text-2xl">
              <Flag className="w-8 h-8 mr-3" />
              Sẵn sàng đua!
            </div>
          ) : (
            racers.map((racer, i) => (
              <div key={racer.id} className="relative h-12 bg-gray-700/50 rounded-full flex items-center px-2">
                {/* Track lane marker */}
                <div className="absolute left-4 text-gray-500 font-bold opacity-50">{i + 1}</div>
                
                <motion.div
                  className={`absolute left-2 h-10 rounded-full flex items-center px-3 shadow-lg ${racer.color} text-white font-bold whitespace-nowrap z-10`}
                  initial={{ width: '15%' }}
                  animate={raceState === 'racing' || raceState === 'done' ? { 
                    width: [
                      '15%', 
                      `${Math.min(racer.targetProgress, 30 + Math.random() * 20)}%`, 
                      `${Math.min(racer.targetProgress, 50 + Math.random() * 20)}%`, 
                      `${Math.min(racer.targetProgress, 20 + Math.random() * 40)}%`, // Slow down/fall back
                      `${racer.targetProgress}%`
                    ] 
                  } : { width: '15%' }}
                  transition={{ 
                    duration: raceState === 'racing' ? racer.duration : 0.5, 
                    ease: "easeInOut",
                    times: [0, 0.2, 0.5, 0.8, 1]
                  }}
                >
                  <span className="truncate max-w-full drop-shadow-md">
                    {racer.student.name}
                  </span>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    🏎️
                  </div>
                </motion.div>
              </div>
            ))
          )}
        </div>

        {/* Winner Reveal */}
        <AnimatePresence>
          {raceState === 'done' && winner && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div 
                className="bg-gradient-to-b from-yellow-300 to-yellow-500 px-12 py-8 rounded-3xl shadow-2xl border-4 border-yellow-200 text-center"
                initial={{ scale: 0, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.6 }}
              >
                <Trophy className="w-20 h-20 mx-auto text-yellow-100 mb-4 drop-shadow-lg" />
                <p className="text-yellow-900 font-bold mb-2 uppercase tracking-widest text-sm">Nhà vô địch</p>
                <h2 className="text-4xl font-black text-white drop-shadow-md">
                  {winner.name}
                </h2>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {raceState === 'idle' || raceState === 'done' ? (
          <button
            onClick={raceState === 'done' ? handleReset : handleStart}
            disabled={selectableIds.length === 0}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              raceState === 'done' 
                ? 'bg-gray-600 hover:bg-gray-700' 
                : 'bg-green-500 hover:bg-green-600'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {raceState === 'done' ? (
              <>
                <RotateCcw className="w-6 h-6" />
                Đua lại
              </>
            ) : (
              <>
                <Flag className="w-6 h-6" />
                Bắt đầu đua
              </>
            )}
          </button>
        ) : (
          <div className="px-8 py-4 rounded-full font-bold text-green-600 bg-green-100 text-lg shadow-inner flex items-center gap-2">
            <span className="animate-pulse">🏎️</span> Đang đua...
          </div>
        )}
      </div>
    </div>
  );
}
