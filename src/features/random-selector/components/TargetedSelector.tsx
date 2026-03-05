import { useState } from 'react';
import { StudentData } from '../services/classService';

interface TargetedSelectorProps {
  students: StudentData[];
  onSelect?: (student: StudentData) => void;
}

export default function TargetedSelector({ students, onSelect }: TargetedSelectorProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);

  if (students.length === 0) {
    return <div className="text-center p-8 text-gray-500">Chưa có học sinh nào.</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        {students.map((student) => (
          <button
            key={student.id}
            onClick={() => setSelectedStudent(student)}
            className={`
              p-4 rounded-xl text-center font-semibold transition-all duration-200 shadow-sm border-2
              ${selectedStudent?.id === student.id 
                ? 'bg-indigo-600 text-white border-indigo-700 scale-105 shadow-md' 
                : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}
            `}
          >
            {student.name}
          </button>
        ))}
      </div>

      {selectedStudent && (
        <div className="mt-8 p-6 bg-indigo-100 border-2 border-indigo-500 rounded-xl text-center animate-fade-in shadow-lg w-full max-w-md flex flex-col items-center gap-4">
          <div>
            <h3 className="text-lg text-indigo-800 font-semibold mb-1">Học sinh được chọn:</h3>
            <p className="text-3xl font-black text-indigo-600">{selectedStudent.name}</p>
          </div>
          
          <button
            onClick={() => onSelect && onSelect(selectedStudent)}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors"
          >
            Xác nhận chọn
          </button>
        </div>
      )}
    </div>
  );
}
