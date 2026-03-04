import { useState, useEffect } from 'react';
import { StudentData } from '../services/classService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface WheelSpinnerProps {
  students: StudentData[];
}

export default function WheelSpinner({ students }: WheelSpinnerProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [rotation, setRotation] = useState(0);

  const spinWheel = () => {
    if (students.length === 0 || isSpinning) return;
    
    setIsSpinning(true);
    setSelectedStudent(null);
    
    // Calculate random rotation
    const spinDuration = 3000; // 3 seconds
    const extraSpins = 5 * 360; // 5 full rotations
    const randomIndex = Math.floor(Math.random() * students.length);
    const sliceAngle = 360 / students.length;
    
    // Target angle to stop at the center of the selected slice
    // We subtract from 360 because the wheel rotates clockwise but slices are drawn clockwise
    const targetAngle = 360 - (randomIndex * sliceAngle + sliceAngle / 2);
    
    const newRotation = rotation + extraSpins + targetAngle - (rotation % 360);
    
    setRotation(newRotation);
    
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedStudent(students[randomIndex]);
    }, spinDuration);
  };

  if (students.length === 0) {
    return <div className="text-center p-8 text-gray-500">Chưa có học sinh nào để quay.</div>;
  }

  // Colors for wheel slices
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-80 h-80 mb-8 overflow-hidden rounded-full border-4 border-indigo-600 shadow-xl">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-indigo-900 z-10"></div>
        
        {/* Wheel */}
        <div 
          className="w-full h-full rounded-full transition-transform ease-out"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '3s' : '0s'
          }}
        >
          {/* Conic-gradient for the wheel background */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${students.map((s, i) => {
                const startAngle = (i * 360) / students.length;
                const endAngle = ((i + 1) * 360) / students.length;
                return `${colors[i % colors.length]} ${startAngle}deg ${endAngle}deg`;
              }).join(', ')})`
            }}
          ></div>
          
          {/* Labels */}
          {students.map((student, index) => {
            const angle = (360 / students.length) * index + (360 / students.length) / 2;
            return (
              <div 
                key={`label-${student.id}`}
                className="absolute w-full h-full top-0 left-0 flex items-start justify-center pt-4 text-white font-bold text-sm drop-shadow-md"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span className="truncate w-24 text-center" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center bottom', marginTop: '40px' }}>
                  {student.name}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full border-4 border-indigo-600 z-10 flex items-center justify-center shadow-inner">
          <div className="w-4 h-4 bg-indigo-600 rounded-full"></div>
        </div>
      </div>

      <button
        onClick={spinWheel}
        disabled={isSpinning}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-12 rounded-full shadow-lg transform transition active:scale-95 disabled:opacity-50 text-xl"
      >
        {isSpinning ? 'Đang quay...' : 'QUAY!'}
      </button>

      {selectedStudent && !isSpinning && (
        <div className="mt-8 p-6 bg-green-100 border-2 border-green-500 rounded-xl text-center animate-bounce shadow-lg flex flex-col items-center gap-3">
          <h3 className="text-lg text-green-800 font-semibold mb-1">Người được chọn:</h3>
          <StudentAvatar 
            student={selectedStudent} 
            avatarConfig={selectedStudent.avatarConfig}
            size={80} 
            className="border-4 border-green-400"
          />
          <p className="text-3xl font-black text-green-600">{selectedStudent.name}</p>
        </div>
      )}
    </div>
  );
}
