import { useState, useEffect } from 'react';
import { StudentData } from '../services/classService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface SlotMachineProps {
  students: StudentData[];
  onSelect?: (student: StudentData) => void;
  selectableIds?: string[];
}

export default function SlotMachine({ students, onSelect, selectableIds }: SlotMachineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [displayDigits, setDisplayDigits] = useState<string[]>(['0', '0']); // [Tens, Units]

  const spin = () => {
    if (students.length === 0 || isSpinning || selectedStudent) return;
    
    // Determine which students can be selected
    const selectableStudents = selectableIds 
      ? students.filter(s => selectableIds.includes(s.id))
      : students;

    if (selectableStudents.length === 0) return;

    setIsSpinning(true);
    
    let counter = 0;
    const interval = setInterval(() => {
      // Random digits during spin
      setDisplayDigits([
        Math.floor(Math.random() * 10).toString(),
        Math.floor(Math.random() * 10).toString()
      ]);
      counter++;
      
      if (counter > 20) {
        clearInterval(interval);
        
        // Pick winner from selectable students
        const winner = selectableStudents[Math.floor(Math.random() * selectableStudents.length)];
        // Find its index in the full students array for the number display
        const winnerIndex = students.findIndex(s => s.id === winner.id);
        const studentNumber = winnerIndex + 1; // 1-based index
        const numberStr = studentNumber.toString().padStart(2, '0');
        
        setDisplayDigits([numberStr[0], numberStr[1]]);
        setIsSpinning(false);

        // Wait 1 second before showing the student name
        setTimeout(() => {
          setSelectedStudent(winner);
          if (onSelect) {
            onSelect(winner);
          }
        }, 1000);
      }
    }, 100);
  };

  const reset = () => {
    setSelectedStudent(null);
    setDisplayDigits(['0', '0']);
    setIsSpinning(false);
  };

  if (students.length === 0) {
    return <div className="text-center p-8 text-gray-500">Chưa có học sinh nào để quay xèng.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
      {!selectedStudent ? (
        <div className="flex flex-col items-center">
          <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl border-8 border-gray-700 relative">
            {/* Slot machine lights */}
            <div className="absolute top-2 left-4 right-4 flex justify-between">
              <div className={`w-3 h-3 rounded-full ${isSpinning ? 'bg-red-500 animate-pulse' : 'bg-red-900'}`}></div>
              <div className={`w-3 h-3 rounded-full ${isSpinning ? 'bg-yellow-500 animate-pulse delay-75' : 'bg-yellow-900'}`}></div>
              <div className={`w-3 h-3 rounded-full ${isSpinning ? 'bg-green-500 animate-pulse delay-150' : 'bg-green-900'}`}></div>
            </div>
            
            <div className="flex gap-4 mt-4 bg-gray-900 p-4 rounded-xl border-4 border-gray-600">
              {displayDigits.map((digit, i) => (
                <div key={i} className="w-32 h-40 bg-white rounded-lg flex items-center justify-center overflow-hidden border-4 border-gray-300 shadow-inner">
                  <span className={`text-8xl font-black text-gray-800 text-center ${isSpinning ? 'animate-bounce blur-sm' : ''}`}>
                    {digit}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex justify-center">
              <button
                onClick={spin}
                disabled={isSpinning}
                className={`
                  w-24 h-24 rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white font-black text-2xl shadow-[0_10px_0_#991b1b] border-4 border-red-400
                  ${isSpinning ? 'translate-y-2 shadow-[0_2px_0_#991b1b]' : 'hover:-translate-y-1 hover:shadow-[0_12px_0_#991b1b] active:translate-y-2 active:shadow-[0_2px_0_#991b1b]'}
                  transition-all duration-150
                `}
              >
                SPIN
              </button>
            </div>
          </div>
          
          <p className="mt-8 text-xl font-bold text-gray-700">
            {isSpinning ? 'Đang quay số...' : 'Nhấn SPIN để quay số thứ tự!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="relative w-[500px] h-auto min-h-[300px] bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 mb-8 border-8 border-yellow-400 transform transition-transform hover:scale-105">
            <p className="text-yellow-100 font-bold mb-4 uppercase tracking-widest text-sm z-10">Số {displayDigits.join('')}</p>
            
            <div className="mb-6 z-10 bg-white rounded-full p-2 shadow-lg">
              <StudentAvatar 
                student={selectedStudent} 
                avatarConfig={selectedStudent.avatarConfig}
                size={120} 
              />
            </div>

            <h3 className="text-5xl font-black text-white text-center leading-tight drop-shadow-lg z-10">
              {selectedStudent.name}
            </h3>
            
            {/* Confetti simulation */}
            <div className="absolute top-0 left-10 w-2 h-8 bg-blue-500 animate-ping"></div>
            <div className="absolute bottom-0 right-10 w-2 h-8 bg-green-500 animate-ping delay-100"></div>
          </div>
          <button
            onClick={reset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-full shadow transition active:scale-95"
          >
            Quay lại
          </button>
        </div>
      )}
    </div>
  );
}
