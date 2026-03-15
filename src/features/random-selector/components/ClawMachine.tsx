import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentData } from '../services/classService';
import { Play, RotateCcw } from 'lucide-react';

interface ClawMachineProps {
  students: StudentData[];
  onSelect: (student: StudentData) => void;
  selectableIds: string[];
  hideSelected: boolean;
}

export default function ClawMachine({ students, onSelect, selectableIds, hideSelected }: ClawMachineProps) {
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [clawPosition, setClawPosition] = useState({ x: 50, y: 10 }); // x: percentage, y: percentage
  const [clawState, setClawState] = useState<'idle' | 'moving' | 'dropping' | 'grabbing' | 'lifting' | 'returning' | 'done'>('idle');
  
  const displayStudents = hideSelected 
    ? students.filter(s => selectableIds.includes(s.id))
    : students;

  const displayStudentIds = displayStudents.map(s => s.id).join(',');

  // Generate random positions for the "toys" (students) in the machine
  const [toys, setToys] = useState<{ student: StudentData, x: number, y: number, color: string, rotation: number }[]>([]);

  useEffect(() => {
    const colors = ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-orange-400'];
    const newToys = displayStudents.map(student => ({
      student,
      x: 10 + Math.random() * 80, // 10% to 90%
      y: 60 + Math.random() * 30, // 60% to 90% (bottom area)
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 60 - 30 // -30 to 30 degrees
    }));
    setToys(newToys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayStudentIds]);

  const handleStart = () => {
    if (selectableIds.length === 0 || clawState !== 'idle') return;

    setIsGrabbing(true);
    
    // Pick a random student
    const randomIndex = Math.floor(Math.random() * selectableIds.length);
    const selectedId = selectableIds[randomIndex];
    const student = students.find(s => s.id === selectedId)!;
    
    // Find the toy corresponding to the student
    const targetToy = toys.find(t => t.student.id === selectedId);
    
    if (!targetToy) {
      // Fallback if toy not found (shouldn't happen)
      onSelect(student);
      return;
    }

    // Animation Sequence
    setClawState('moving');
    setClawPosition({ x: targetToy.x, y: 10 });

    setTimeout(() => {
      setClawState('dropping');
      setClawPosition({ x: targetToy.x, y: targetToy.y - 10 }); // Drop to just above the toy
      
      setTimeout(() => {
        setClawState('grabbing');
        
        setTimeout(() => {
          setClawState('lifting');
          setClawPosition({ x: targetToy.x, y: 10 }); // Lift up
          setSelectedStudent(student); // Attach student to claw
          
          setTimeout(() => {
            setClawState('returning');
            setClawPosition({ x: 10, y: 10 }); // Move to drop chute
            
            setTimeout(() => {
              setClawState('done');
              setTimeout(() => {
                onSelect(student);
              }, 1000);
            }, 1000);
          }, 1000);
        }, 500);
      }, 1000);
    }, 1000);
  };

  const handleReset = () => {
    setIsGrabbing(false);
    setSelectedStudent(null);
    setClawState('idle');
    setClawPosition({ x: 50, y: 10 });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <div className="relative w-full aspect-[4/3] bg-blue-50 rounded-3xl border-8 border-indigo-600 shadow-2xl overflow-hidden mb-8">
        {/* Machine Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-indigo-200 opacity-50" />
        
        {/* Drop Chute */}
        <div className="absolute left-4 bottom-4 w-24 h-32 border-4 border-indigo-800 rounded-lg bg-black/20 z-0 flex items-end justify-center pb-2">
          <div className="w-20 h-4 bg-black/40 rounded-full blur-sm" />
        </div>

        {/* Toys (Students) */}
        {toys.map((toy) => {
          const isSelected = selectedStudent?.id === toy.student.id;
          const isSelectable = selectableIds.includes(toy.student.id);
          
          // If selected, it moves with the claw. Otherwise, it stays in place.
          const currentX = isSelected ? clawPosition.x : toy.x;
          const currentY = isSelected ? clawPosition.y + 15 : toy.y;
          
          return (
            <motion.div
              key={toy.student.id}
              className={`absolute flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-lg border-2 border-white/50 z-10 ${toy.color} ${!isSelectable && !isSelected ? 'opacity-40 grayscale' : ''}`}
              animate={{
                left: `${currentX}%`,
                top: `${currentY}%`,
                rotate: isSelected ? 0 : toy.rotation,
                x: '-50%',
                y: '-50%',
                scale: isSelected && clawState === 'done' ? 0 : 1
              }}
              transition={{
                type: isSelected ? 'tween' : 'spring',
                duration: isSelected ? (clawState === 'dropping' || clawState === 'lifting' || clawState === 'returning' || clawState === 'moving' ? 1 : 0.5) : 0
              }}
            >
              <div className="text-xs font-bold text-white text-center px-1 leading-tight line-clamp-2 drop-shadow-md">
                {toy.student.name.split(' ').pop()}
              </div>
            </motion.div>
          );
        })}

        {/* The Claw */}
        <motion.div
          className="absolute top-0 z-20 flex flex-col items-center"
          animate={{
            left: `${clawPosition.x}%`,
            top: `${clawPosition.y}%`,
            x: '-50%'
          }}
          transition={{ type: 'tween', duration: 1, ease: 'easeInOut' }}
        >
          {/* Claw string */}
          <div className="w-1 bg-gray-400 absolute bottom-full h-[500px]" />
          
          {/* Claw Base */}
          <div className="w-8 h-4 bg-gray-700 rounded-t-lg relative z-10" />
          
          {/* Claw Arms */}
          <div className="flex justify-between w-16 -mt-1 relative z-0">
            <motion.div 
              className="w-2 h-12 bg-gray-600 origin-top-right rounded-bl-lg"
              animate={{ rotate: (clawState === 'grabbing' || clawState === 'lifting' || clawState === 'returning') ? -15 : 25 }}
            />
            <motion.div 
              className="w-2 h-12 bg-gray-600 origin-top-left rounded-br-lg"
              animate={{ rotate: (clawState === 'grabbing' || clawState === 'lifting' || clawState === 'returning') ? 15 : -25 }}
            />
          </div>
        </motion.div>
        
        {/* Glass reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/30 pointer-events-none z-30" />
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {clawState === 'idle' || clawState === 'done' ? (
          <button
            onClick={clawState === 'done' ? handleReset : handleStart}
            disabled={selectableIds.length === 0}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              clawState === 'done' 
                ? 'bg-gray-600 hover:bg-gray-700' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {clawState === 'done' ? (
              <>
                <RotateCcw className="w-6 h-6" />
                Chơi lại
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Gắp thú
              </>
            )}
          </button>
        ) : (
          <div className="px-8 py-4 rounded-full font-bold text-indigo-600 bg-indigo-100 text-lg shadow-inner">
            Đang gắp...
          </div>
        )}
      </div>
    </div>
  );
}
