import { useState } from 'react';
import { StudentData } from '../services/classService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface CardDrawProps {
  students: StudentData[];
  onSelect?: (student: StudentData) => void;
}

export default function CardDraw({ students, onSelect }: CardDrawProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [cards, setCards] = useState<number[]>([1, 2, 3, 4, 5]); // Show 5 generic cards
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  const drawCard = (index: number) => {
    if (students.length === 0 || isDrawing || selectedStudent) return;
    
    setIsDrawing(true);
    setSelectedCardIndex(index);
    
    // Simulate drawing animation
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * students.length);
      const winner = students[randomIndex];
      setSelectedStudent(winner);
      setIsDrawing(false);
      if (onSelect) {
        onSelect(winner);
      }
    }, 1500);
  };

  const reset = () => {
    setSelectedStudent(null);
    setSelectedCardIndex(null);
    setIsDrawing(false);
  };

  if (students.length === 0) {
    return <div className="text-center p-8 text-gray-500">Chưa có học sinh nào để bốc thăm.</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
      {!selectedStudent ? (
        <>
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Chọn một lá phiếu</h2>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => drawCard(index)}
                disabled={isDrawing}
                className={`
                  w-24 h-36 rounded-xl shadow-md border-2 transition-all duration-500 flex items-center justify-center
                  ${selectedCardIndex === index 
                    ? 'border-indigo-500 bg-indigo-100 scale-110 -translate-y-4 shadow-xl' 
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:-translate-y-2 hover:shadow-lg'}
                  ${isDrawing && selectedCardIndex !== index ? 'opacity-50 scale-95' : ''}
                `}
              >
                <div className="w-16 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 font-bold text-2xl">?</span>
                </div>
              </button>
            ))}
          </div>
          {isDrawing && (
            <p className="text-indigo-600 font-medium animate-pulse">Đang mở phiếu...</p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="w-64 h-auto min-h-[320px] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-6 mb-8 transform transition-transform hover:scale-105">
            <div className="w-full h-full border-4 border-white/20 rounded-xl flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm p-4 gap-4">
              <p className="text-white/80 font-medium mb-2 uppercase tracking-widest text-sm">Người được chọn</p>
              
              <div className="bg-white/20 rounded-full p-2">
                <StudentAvatar 
                  student={selectedStudent} 
                  avatarConfig={selectedStudent.avatarConfig}
                  size={80} 
                />
              </div>

              <h3 className="text-3xl font-black text-white text-center leading-tight">
                {selectedStudent.name}
              </h3>
            </div>
          </div>
          <button
            onClick={reset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-full shadow transition active:scale-95"
          >
            Bốc thăm lại
          </button>
        </div>
      )}
    </div>
  );
}
