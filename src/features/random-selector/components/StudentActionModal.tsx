import { useState } from 'react';
import { X, Check, ThumbsUp, ThumbsDown, Clock, SkipForward, Users } from 'lucide-react';
import { StudentData } from '../services/classService';
import { StudentAvatar } from '../../../components/Avatar/StudentAvatar';

interface StudentActionModalProps {
  student: StudentData;
  groupName?: string;
  isGroup?: boolean;
  onClose: () => void;
  onAwardPoints: (points: number, toGroup?: boolean) => void;
  onAddToQueue: () => void;
  onSkip: () => void;
}

export default function StudentActionModal({ 
  student, 
  groupName,
  isGroup,
  onClose, 
  onAwardPoints, 
  onAddToQueue, 
  onSkip 
}: StudentActionModalProps) {
  const [awardToGroup, setAwardToGroup] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex justify-center mb-4">
            <div className="p-1 bg-white rounded-full">
              <StudentAvatar 
                student={student}
                avatarConfig={student.avatarConfig}
                size={96}
              />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">{student.name}</h2>
          <p className="text-indigo-200">{isGroup ? 'Nhóm đã được chọn!' : 'Đã được chọn!'}</p>
          {groupName && !isGroup && (
            <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-xs text-white font-medium">
              <Users size={12} />
              {groupName}
            </div>
          )}
        </div>
        
        <div className="p-6 space-y-4">
          {groupName && !isGroup && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <input
                type="checkbox"
                id="awardToGroup"
                checked={awardToGroup}
                onChange={(e) => setAwardToGroup(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="awardToGroup" className="text-sm font-bold text-indigo-700 cursor-pointer flex items-center gap-1">
                Cộng điểm cho cả nhóm <span className="text-xs font-normal opacity-70">(Mọi thành viên đều được điểm)</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onAwardPoints(10, awardToGroup)}
              className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-xl transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center mb-2 text-green-600">
                <ThumbsUp size={20} />
              </div>
              <span className="font-bold text-green-700">Đúng (+10)</span>
            </button>
            
            <button
              onClick={() => onAwardPoints(-5, awardToGroup)}
              className="flex flex-col items-center justify-center p-4 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-400 rounded-xl transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center mb-2 text-red-600">
                <ThumbsDown size={20} />
              </div>
              <span className="font-bold text-red-700">Sai (-5)</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onAddToQueue}
              className="flex items-center justify-center gap-2 p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 hover:border-yellow-400 rounded-lg text-yellow-700 font-medium transition-colors"
            >
              <Clock size={18} />
              Hàng chờ
            </button>
            
            <button
              onClick={onSkip}
              className="flex items-center justify-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-colors"
            >
              <SkipForward size={18} />
              Bỏ qua
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
