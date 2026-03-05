import { useState, useEffect } from 'react';
import { StudentData } from '../services/classService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface RandomNameProps {
  students: StudentData[];
  onSelect?: (student: StudentData) => void;
  selectableIds?: string[];
}

export default function RandomName({ students, onSelect, selectableIds }: RandomNameProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(null);

  const selectRandom = () => {
    if (students.length === 0 || isSelecting) return;
    
    // Determine which students can be selected
    const selectableStudents = selectableIds 
      ? students.filter(s => selectableIds.includes(s.id))
      : students;

    if (selectableStudents.length === 0) return;

    setIsSelecting(true);
    setSelectedStudent(null);
    
    let counter = 0;
    const maxIterations = 30;
    const intervalTime = 50; // ms
    
    const interval = setInterval(() => {
      // For visual effect, we can show any student from the list
      const visualRandomIndex = Math.floor(Math.random() * students.length);
      const visualRandomStudent = students[visualRandomIndex];
      setCurrentStudent(visualRandomStudent);
      counter++;
      
      if (counter >= maxIterations) {
        clearInterval(interval);
        setIsSelecting(false);
        
        // Pick the actual winner from selectable students
        const winner = selectableStudents[Math.floor(Math.random() * selectableStudents.length)];
        setCurrentStudent(winner);
        setSelectedStudent(winner);
        if (onSelect) {
          onSelect(winner);
        }
      }
    }, intervalTime);
  };

  if (students.length === 0) {
    return <div className="text-center p-8 text-gray-500">Chưa có học sinh nào để chọn.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className={`
        w-full max-w-md h-80 bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center p-8 mb-12 border-4 transition-all duration-300 gap-6
        ${isSelecting ? 'border-indigo-400 scale-105' : selectedStudent ? 'border-green-500 scale-110' : 'border-gray-200'}
      `}>
        {currentStudent ? (
          <>
            <StudentAvatar 
              student={currentStudent} 
              avatarConfig={currentStudent.avatarConfig}
              size={120} 
              className={`transition-transform duration-100 ${isSelecting ? 'scale-110' : ''}`}
            />
            <h2 className={`
              text-3xl sm:text-4xl font-black text-center transition-colors duration-300
              ${isSelecting ? 'text-indigo-600' : selectedStudent ? 'text-green-600' : 'text-gray-800'}
            `}>
              {currentStudent.name}
            </h2>
          </>
        ) : (
          <div className="text-gray-400 text-6xl font-black">?</div>
        )}
      </div>

      <button
        onClick={selectRandom}
        disabled={isSelecting}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-16 rounded-full shadow-lg transform transition active:scale-95 disabled:opacity-50 text-2xl"
      >
        {isSelecting ? 'Đang chọn...' : 'CHỌN NGẪU NHIÊN'}
      </button>

      {selectedStudent && !isSelecting && (
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-gray-500 font-medium">Đã chọn:</p>
          <p className="text-2xl font-bold text-gray-900">{selectedStudent.name}</p>
        </div>
      )}
    </div>
  );
}
