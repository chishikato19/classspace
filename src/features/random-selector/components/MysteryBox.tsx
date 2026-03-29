import { useState } from 'react';
import { StudentData } from '../services/classService';
import { Gift } from 'lucide-react';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface MysteryBoxProps {
  students: StudentData[];
  onSelect?: (student: StudentData) => void;
  selectableIds?: string[];
  hideSelected?: boolean;
}

export default function MysteryBox({ students, onSelect, selectableIds, hideSelected }: MysteryBoxProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);

  const openBox = () => {
    if (students.length === 0 || isOpening || selectedStudent) return;
    
    // Determine which students can be selected
    const selectableStudents = selectableIds 
      ? students.filter(s => selectableIds.includes(s.id))
      : students;

    if (selectableStudents.length === 0) return;

    setIsOpening(true);
    
    // Simulate opening animation
    setTimeout(() => {
      // Pick a winner from selectable students
      const winner = selectableStudents[Math.floor(Math.random() * selectableStudents.length)];
      setSelectedStudent(winner);
      setIsOpening(false);
      if (onSelect) {
        onSelect(winner);
      }
    }, 2000);
  };

  const reset = () => {
    setSelectedStudent(null);
    setIsOpening(false);
  };

  if (students.length === 0) {
    return <div className="text-center p-8 text-gray-500">Chưa có danh sách để mở hộp.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
      {!selectedStudent ? (
        <div className="flex flex-col items-center">
          <button
            onClick={openBox}
            disabled={isOpening}
            className={`
              relative group transition-all duration-500 overflow-hidden rounded-2xl
              ${isOpening ? 'scale-110' : 'hover:scale-105 hover:-translate-y-2'}
            `}
          >
            <div className={`
              w-48 h-48 bg-gradient-to-br from-amber-400 to-orange-600 shadow-2xl flex items-center justify-center border-4 border-amber-300 relative z-10
              ${isOpening ? 'animate-pulse' : ''}
            `}>
              <Gift className={`w-24 h-24 text-white relative z-20 ${isOpening ? 'animate-bounce' : ''}`} />
              
              {/* Ribbon decorations */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-full bg-red-500/80 z-0"></div>
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-8 bg-red-500/80 z-0"></div>
            </div>
          </button>
          
          <p className="mt-8 text-xl font-bold text-gray-700">
            {isOpening ? 'Đang mở hộp quà...' : 'Nhấn vào hộp để chọn ngẫu nhiên!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="relative w-80 h-80 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full shadow-2xl flex flex-col items-center justify-center p-8 mb-8 border-8 border-white transform transition-transform hover:scale-105">
            <p className="text-amber-900 font-bold mb-4 uppercase tracking-widest text-sm z-10">Người được chọn</p>
            
            <div className="mb-4 z-10 bg-white/30 rounded-full p-2 backdrop-blur-sm">
              <StudentAvatar 
                student={selectedStudent} 
                avatarConfig={selectedStudent.avatarConfig}
                size={100} 
              />
            </div>

            <h3 className="text-3xl font-black text-white text-center leading-tight drop-shadow-lg z-10">
              {selectedStudent.name}
            </h3>
          </div>
          <button
            onClick={reset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-full shadow transition active:scale-95"
          >
            Mở hộp khác
          </button>
        </div>
      )}
    </div>
  );
}
