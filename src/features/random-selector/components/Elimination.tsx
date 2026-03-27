import { useState, useEffect } from 'react';
import { StudentData } from '../services/classService';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface EliminationProps {
  students: StudentData[];
  onSelect?: (student: StudentData) => void;
  selectableIds?: string[];
  hideSelected?: boolean;
}

export default function Elimination({ students, onSelect, selectableIds, hideSelected }: EliminationProps) {
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [winner, setWinner] = useState<StudentData | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const selectableIdsString = selectableIds?.join(',') || '';

  // Initialize eliminatedIds with non-selectable students
  useEffect(() => {
    if (selectableIds && hideSelected) {
      const initialEliminated = new Set<string>();
      students.forEach(s => {
        if (!selectableIds.includes(s.id)) {
          initialEliminated.add(s.id);
        }
      });
      setEliminatedIds(initialEliminated);
    } else {
      setEliminatedIds(new Set());
    }
    setWinner(null);
    setIsRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, selectableIdsString, hideSelected]);

  const startElimination = async () => {
    // Determine which students can be selected
    const selectableStudents = selectableIds 
      ? students.filter(s => selectableIds.includes(s.id))
      : students;

    if (isRunning || selectableStudents.length < 2) return;
    
    setIsRunning(true);
    setWinner(null);

    // Create a copy of selectable students to manipulate
    let remaining = [...selectableStudents];
    
    // Elimination loop
    while (remaining.length > 1) {
      // Pick a random student to eliminate
      const randomIndex = Math.floor(Math.random() * remaining.length);
      const eliminated = remaining[randomIndex];
      
      // Update state to show elimination
      setEliminatedIds(prev => {
        const newSet = new Set(prev);
        newSet.add(eliminated.id);
        return newSet;
      });
      
      // Remove from local tracking array
      remaining.splice(randomIndex, 1);
      
      // Wait for animation (speed up as fewer students remain)
      const delay = Math.max(100, 800 - (selectableStudents.length - remaining.length) * 50);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // The last one standing
    const finalWinner = remaining[0];
    setWinner(finalWinner);
    setIsRunning(false);
    
    if (onSelect) {
      // Wait a bit for the winner animation to start
      setTimeout(() => {
        onSelect(finalWinner);
      }, 1500);
    }
  };

  const reset = () => {
    setEliminatedIds(new Set());
    setWinner(null);
    setIsRunning(false);
  };

  if (students.length === 0) {
    return <div className="text-center p-8 text-gray-500">Chưa có học sinh nào để loại trừ.</div>;
  }

  return (
    <div className="flex flex-col items-center w-full h-full">
      <div className="flex justify-between items-center w-full max-w-4xl mb-6 px-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {winner ? 'Người sống sót cuối cùng!' : 'Chế độ Sinh Tồn'}
        </h2>
        <div className="space-x-4">
          <button
            onClick={startElimination}
            disabled={isRunning || students.length < 2 || !!winner}
            className={`
              font-bold py-2 px-6 rounded-lg shadow transition-colors
              ${isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}
              disabled:opacity-50
            `}
          >
            {isRunning ? 'Đang loại trừ...' : 'Bắt đầu'}
          </button>
          <button
            onClick={reset}
            disabled={isRunning}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg shadow disabled:opacity-50 transition-colors"
          >
            Làm mới
          </button>
        </div>
      </div>

      {winner && (
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          className="mb-8 p-8 bg-yellow-100 border-4 border-yellow-500 rounded-2xl shadow-2xl text-center z-20 flex flex-col items-center"
        >
          <p className="text-yellow-800 font-bold uppercase tracking-widest mb-4">Winner</p>
          <StudentAvatar 
            student={winner} 
            avatarConfig={winner.avatarConfig}
            size={120} 
            className="mb-4 border-4 border-yellow-400 shadow-lg"
          />
          <h3 className="text-4xl font-black text-gray-900">{winner.name}</h3>
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 w-full max-w-full px-4 overflow-y-auto flex-1 p-4">
        <AnimatePresence>
          {students.map((student) => {
            const isEliminated = eliminatedIds.has(student.id);
            const isWinner = winner?.id === student.id;

            return (
              <motion.div
                key={student.id}
                layout
                initial={{ opacity: 1, scale: 1 }}
                animate={{ 
                  opacity: isEliminated ? 0.5 : 1,
                  scale: isEliminated ? 0.9 : (isWinner ? 1.1 : 1),
                  filter: isEliminated ? 'grayscale(100%)' : 'none',
                }}
                className={`
                  relative p-4 rounded-xl shadow-md border-2 flex flex-col items-center justify-center text-center min-h-[140px] gap-3 bg-white
                  ${isEliminated ? 'border-gray-200 bg-gray-50' : 'border-indigo-100 hover:border-indigo-300'}
                  ${isWinner ? 'border-yellow-500 ring-4 ring-yellow-200 shadow-xl bg-yellow-50' : ''}
                `}
              >
                <StudentAvatar 
                  student={student} 
                  avatarConfig={student.avatarConfig}
                  size={64} 
                  className={`transition-all ${isEliminated ? 'opacity-50' : ''}`}
                />
                
                {isEliminated && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="w-3/4 h-1 bg-red-500/50 rotate-45 absolute rounded-full" />
                    <div className="w-3/4 h-1 bg-red-500/50 -rotate-45 absolute rounded-full" />
                  </div>
                )}
                
                <span className={`text-sm font-medium ${isEliminated ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {student.name}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
