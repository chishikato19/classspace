import { useState } from 'react';
import { StudentData } from '../services/classService';
import { Wand2 } from 'lucide-react';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface MagicHatProps {
  students: StudentData[];
  onSelect?: (student: StudentData) => void;
  selectableIds?: string[];
}

export default function MagicHat({ students, onSelect, selectableIds }: MagicHatProps) {
  const [isMagic, setIsMagic] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);

  const performMagic = () => {
    if (students.length === 0 || isMagic || selectedStudent) return;
    
    // Determine which students can be selected
    const selectableStudents = selectableIds 
      ? students.filter(s => selectableIds.includes(s.id))
      : students;

    if (selectableStudents.length === 0) return;

    setIsMagic(true);
    
    // Simulate magic animation
    setTimeout(() => {
      // Pick a winner from selectable students
      const winner = selectableStudents[Math.floor(Math.random() * selectableStudents.length)];
      setSelectedStudent(winner);
      setIsMagic(false);
      if (onSelect) {
        onSelect(winner);
      }
    }, 2500);
  };

  const reset = () => {
    setSelectedStudent(null);
    setIsMagic(false);
  };

  if (students.length === 0) {
    return <div className="text-center p-8 text-gray-500">Chưa có học sinh nào để làm ảo thuật.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
      {!selectedStudent ? (
        <div className="flex flex-col items-center">
          <button
            onClick={performMagic}
            disabled={isMagic}
            className="relative group transition-all duration-500 focus:outline-none"
          >
            <div className={`
              w-40 h-40 bg-gray-900 rounded-t-lg rounded-b-3xl shadow-2xl flex items-center justify-center relative z-10 border-b-8 border-red-600
              ${isMagic ? 'animate-bounce' : 'hover:-translate-y-2'}
            `}>
              {/* Hat brim */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-56 h-8 bg-gray-900 rounded-[50%] z-0 border-b-4 border-gray-800"></div>
              
              {isMagic && (
                <div className="absolute -top-12 animate-pulse">
                  <Wand2 className="w-16 h-16 text-yellow-400 rotate-45" />
                </div>
              )}
            </div>
            
            {/* Magic sparkles */}
            {isMagic && (
              <>
                <div className="absolute top-0 left-0 w-4 h-4 bg-yellow-300 rounded-full animate-ping"></div>
                <div className="absolute top-10 right-0 w-3 h-3 bg-blue-300 rounded-full animate-ping delay-100"></div>
                <div className="absolute bottom-10 left-10 w-5 h-5 bg-purple-300 rounded-full animate-ping delay-200"></div>
              </>
            )}
          </button>
          
          <p className="mt-12 text-xl font-bold text-gray-700">
            {isMagic ? 'Úm ba la xì bùa...' : 'Nhấn vào chiếc mũ ảo thuật!'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="relative w-80 h-auto min-h-[300px] bg-gradient-to-b from-purple-600 to-indigo-800 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 mb-8 border-4 border-purple-400 transform transition-transform hover:scale-105 overflow-hidden">
            {/* Star background */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute top-12 right-8 w-3 h-3 bg-white rounded-full"></div>
              <div className="absolute bottom-8 left-12 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute bottom-4 right-4 w-4 h-4 bg-white rounded-full"></div>
            </div>
            
            <p className="text-purple-200 font-bold mb-4 uppercase tracking-widest text-sm z-10">Học sinh xuất hiện</p>
            
            <div className="mb-6 z-10 bg-white/20 rounded-full p-2 backdrop-blur-sm">
              <StudentAvatar 
                student={selectedStudent} 
                avatarConfig={selectedStudent.avatarConfig}
                size={100} 
              />
            </div>

            <h3 className="text-4xl font-black text-white text-center leading-tight drop-shadow-lg z-10">
              {selectedStudent.name}
            </h3>
          </div>
          <button
            onClick={reset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-full shadow transition active:scale-95"
          >
            Làm phép lại
          </button>
        </div>
      )}
    </div>
  );
}
